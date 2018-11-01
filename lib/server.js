"use strict";

const {promisify} = require("util");
const fs = require("fs");
const path = require("path");
const url = require("url");
const {getLocaleFromPath, isTranslated, translate, getPageLocales,
  getLocaleFromHeader} = require("../lib/i18n");
const {existsSync} = fs;
const {parsePage} = require("../lib/parser");
const {getPermalinkedPage, isPagePermalinked,
  getPagePermalink} = require("../lib/sitedata");
const {ensureDirSync, copySync, moveSync} = require("fs-extra");
const glob = promisify(require("glob").glob);
const stream = require("stream");
const {Readable} = stream;
// Configurations
const config = require("../config");
const {pageExtestions, multiLang, gzip, generationType} = config;
const {defaultLocale} = config.i18nOptions;
const {publicDir, pageDir, contentDir, localesDir} = config.dirs;
const fileStat = promisify(fs.stat);
const zlib = require("zlib");
const gzipExt = ".gzip";
const staticExt = ".html";
let staticGenCallback = null;

const resourcesMap = {
  ".html": {encoding: "utf-8", type: "text/html"},
  ".ejs": {encoding: "utf-8", type: "text/html"},
  ".md": {encoding: "utf-8", type: "text/html"},
  ".js": {encoding: "utf-8", type: "text/javascript"},
  ".css": {encoding: "utf-8", type: "text/css"},
  ".txt": {encoding: "utf-8", type: "text/plain"},
  ".json": {encoding: "utf-8", type: "application/json"},
  ".ico": {encoding: "binary", type: "image/x-icon"},
  ".png": {encoding: "binary", type: "image/png"},
  ".jpg": {encoding: "binary", type: "image/jpg"},
  ".gif": {encoding: "binary", type: "image/gif"},
  ".woff": {encoding: "binary", type: "application/font-woff"},
  ".woff2": {encoding: "binary", type: "font/woff2"},
  ".ttf": {encoding: "binary", type: "application/font-ttf"},
  ".eot": {encoding: "binary", type: "application/vnd.ms-fontobject"},
  ".otf": {encoding: "binary", type: "application/font-otf"},
  ".svg": {encoding: "binary", type: "image/svg+xml"},
  ".zip": {encoding: "binary", type: "application/zip"}
};

// Caching the request
let isCache = false;
// Static content generation
let isStatic = false;
// Static content generation stack
let staticStack = [];

/**
 * Starts the HTTP or HTTPS server In order to start HTTPS server you will need
 * to store Private Key and fullchain(cert.pem + chain.pem) on your server, you
 * can start HTTPS server with the command similar to the one below
 * npm start -- --https -k /<privkey-path>.pem -c /<fullchain-path>.pem
 * @param {Object} argv Arguments vector
 *                    {boolen} https - Start HTTPS server
 *                    {String} k - Path to the Private key for HTTPS connection
 *                    {String} c - Path to the fullchain
 */
let runServer = (argv) =>
{
  isCache = argv.cache != false;

  // Create HTTPS or HTTP server
  let server = null;
  const isHttps = (argv.k && argv.c && argv.https);
  if (isHttps)
  {
    let options = {
      key: fs.readFileSync(argv.k),
      cert: fs.readFileSync(argv.c)
    };
    server = require("https").createServer(options, onRequest);
  }
  else
  {
    server = require("http").createServer(onRequest);
  }

  let port = isHttps ? config.port.https : config.port.http;
  server.on("error", (err) =>
  {
    let error = err.Error;
    if (err.code === "EADDRINUSE")
      error = `Port ${port} is in use`;

    throw error;
  });

  server.listen(port, config.hostname, () =>
  {
    const protocol = `http${isHttps ? "s" : ""}:`;
    console.log(`Listening to: ${protocol}//${config.hostname}:${port}`);
  });

  if (isHttps)
  {
    redirectHTTP();
  }
};

/**
 * Redirects the http request
 */
function redirectHTTP()
{
  require("http").createServer((req, res) =>
  {
    res.statusCode = 301;
    res.setHeader("Location", "https://" + req.headers["host"] + req.url);
    res.end();
  }).listen(config.port.http);
}

const getHeaders = (req) => req.headers || {};

/**
 * Check if user accept GZIP
 * @param {Object} req ClientRequest
 */
function acceptGzip(req)
{
  const acceptEncoding = getHeaders(req)["accept-encoding"];
  return acceptEncoding && /\bgzip\b/.test(acceptEncoding);
}

/**
 * Ensure that File exist, but not Directory
 * @param {String} file path to the file
 */
function fileExistsSync(file)
{
  return existsSync(file) && !fs.lstatSync(file).isDirectory();
}

function getLocale(req, page)
{
  const pathFromLocale = getLocaleFromPath(url.parse(req.url).pathname);
  if (!multiLang)
  {
    return "";
  }
  // Use locale from the request
  else if (pathFromLocale)
  {
    return pathFromLocale;
  }
  // Use accept-language header
  else
  {
    const acceptLanguage = getHeaders(req)["accept-language"];
    return getLocaleFromHeader([defaultLocale, ...getPageLocales(page)],
                               acceptLanguage);
  }
}

function getPathnameWithoutLocale(req)
{
  const {pathname} = url.parse(req.url);
  const locale = getLocaleFromPath(pathname);
  let pathnameParts = pathname.split("/");
  pathnameParts.shift();

  pathnameParts = pathnameParts.filter((part) => part != locale);

  return path.join(...pathnameParts);
}

function resolveResourceData(pathnameWithoutLocale)
{
  const parsedPath = path.parse(pathnameWithoutLocale);
  const {dir, name} = parsedPath;
  let {ext} = parsedPath;
  let page = path.join(dir, name);
  let permalink = null;

  if (getPermalinkedPage(page))
  {
    permalink = page;
    page = getPermalinkedPage(page);
  }

  if (!ext && !(ext = findExtension(page)))
  {
    // Check for index page
    const indexPage = path.join(page, "index");
    if (ext = findExtension(indexPage))
      page = indexPage;
  }

  let {encoding, type} = resourcesMap[ext] || {};
  if (!ext)
  {
    ext = "";
    // Fallback for files without extensions
    ({encoding, type} = resourcesMap[".txt"]);
  }

  return {page, ext, encoding, type, permalink};
}

/**
 * requestListener
 * @param {Object} req ClientRequest
 * @param {Object} res ServerResponse
 */
function onRequest(req, res)
{
  const pathnameWithoutLocale = getPathnameWithoutLocale(req);
  const isPermalinked = isPagePermalinked(pathnameWithoutLocale);
  const parsedPath = path.parse(pathnameWithoutLocale);
  const {dir, name, base} = parsedPath;
  const isPageExtensionRequested = pageExtestions.includes(parsedPath.ext);
  const isPublicFile = fileExistsSync(path.join(publicDir, dir, base));
  const {page, ext, encoding, permalink,
    type} = resolveResourceData(pathnameWithoutLocale);
  const locale = getLocale(req, page);
  const cachePath = getCachedFilePath(page, ext, locale, acceptGzip(req));

  if (name == 404)
    res.statusCode = 404;

  // Do not allow index in the address and permalinked pages
  if (base == "index" || isPermalinked)
  {
    request404Page(req, res);
  }
  // Do not allow page extensions in the address, unless public
  else if (isPageExtensionRequested && !isPublicFile)
  {
    writeError(res, 404);
  }
  // Not supported types
  else if (!encoding || !type)
  {
    writeError(res, 501);
  }
  else if (cachePath)
  {
    if (cachePath.endsWith(gzipExt))
      res.setHeader("Content-Encoding", "gzip");

    const readStream = fs.createReadStream(cachePath);
    fileStat(cachePath).then((stats) =>
    {
      res.setHeader("etag", stats.mtimeMs.toString());
      res.setHeader("Cache-Control", "max-age=86400");
      writeResponse(res, readStream, encoding, type);
    });
  }
  else if (isPublicFile)
  {
    const readStream = fs.createReadStream(path.join(publicDir, page) + ext);
    writeResponse(res, readStream, encoding, type);

    // Cache
    if (isCache)
      cacheFile(path.join(contentDir, page) + ext, readStream);
  }
  else if (pageExtestions.includes(ext) &&
          (!multiLang || isTranslated(page, locale) ||
          locale === defaultLocale))
  {
    parsePage(page, ext, locale).then((html) =>
    {
      if (localesDir)
        html = translate(html, page, locale);

      writeResponse(res, html, encoding, type);

      // cache
      if (isCache)
      {
        const readableData = new Readable();
        readableData.push(html);
        readableData.push(null);
        const location = (isStatic && permalink) ? permalink : page;
        const filePath = path.join(contentDir, locale, location) + staticExt;
        cacheFile(filePath, readableData);
      }
    }).catch((reason) =>
    {
      if (reason.code == "ENOENT") // No such file
      {
        writeError(res, 404);
      }
      else
      {
        writeError(res, 500, reason.message); // 500 Internal Server Error
      }
    });
  }
  else if (!ext && res.statusCode != 404)
  {
    request404Page(req, res);
  }
  else
  {
    writeError(res, 404);
  }
}

function postContentGeneration()
{
  switch (generationType)
  {
    case "Index":
      moveSync(path.join(contentDir, defaultLocale), contentDir);
      break;
    case "Double":
      copySync(path.join(contentDir, defaultLocale), contentDir);
      break;
  }
}

/**
 * Caching file in the Server
 * @param {String} filePath path to the caching destination
 * @param {stream.Readable} readableStream Readable stream of the file
 */
function cacheFile(filePath, readableStream)
{
  const fileCached = (outputFilePath) =>
  {
    if (isStatic)
    {
      // console.log(`${outputFilePath} generated`);
      staticStack.pop();
      if (!staticStack.length)
      {
        if (multiLang)
          postContentGeneration();

        console.log("static content is generated");
        staticGenCallback();
      }
    }
    else
    {
      console.log(`${outputFilePath} cached`);
    }
  };
  const pipeAndManageStream = (writableStream) =>
  {
    writableStream.on("finish", () => fileCached(writableStream.path));
    writableStream.on("error", console.error);
    if (writableStream.path.endsWith(gzipExt))
      readableStream.pipe(zlib.createGzip()).pipe(writableStream);
    else
      readableStream.pipe(writableStream);
  };
  ensureDirSync(path.parse(filePath).dir);
  pipeAndManageStream(fs.createWriteStream(filePath));
  if (gzip)
    pipeAndManageStream(fs.createWriteStream(filePath + gzipExt));
}

/**
 * Generates static website
 */
const pushToStaticStack = (filePath) =>
{
  staticStack.push(filePath);
  if (gzip)
    staticStack.push(filePath + gzipExt);
};

const popFromStaticStack = () =>
{
  staticStack.pop();
  if (gzip)
    staticStack.pop();
};

let generateStatic = (callback) =>
{
  isStatic = true;
  isCache = true;
  staticGenCallback = callback;

  const pages = glob(`${pageDir}/**/*.*`);
  const locales = glob(`${localesDir}/*`);
  const publics = glob(`${publicDir}/**/*.*`);
  Promise.all([pages, locales, publics]).then(([files, locales, publics]) =>
  {
    if (!multiLang)
      locales = [""];

    // Generate pages
    locales = locales.map((locale) => path.parse(locale).base);
    const requestUrls = [];

    for (const publicDirFile of publics)
    {
      const publicUrl = publicDirFile.replace(publicDir, "");
      const staticPath = path.join(contentDir, publicUrl);
      requestUrls.push(publicUrl);
      pushToStaticStack(staticPath);
    }

    for (let file of files)
    {
      for (const locale of locales)
      {
        const permalink = getPagePermalink(file);
        if (permalink)
          file = permalink;

        file = file.replace(pageDir, "");
        let {dir, name} = path.parse(file);
        const staticPath = path.join(contentDir, locale, dir, name) + staticExt;
        pushToStaticStack(staticPath);

        if (name == "index")
        {
          requestUrls.push(path.join("/", locale, dir));
        }
        else
        {
          requestUrls.push(path.join("/", locale, dir, name));
        }
      }
    }

    // Generate public
    for (const url of requestUrls)
    {
      onRequest({url}, {});
    }
  });
};

/**
 * Get the filePath if the file is cached
 * @param {String} requestPath    requestPath without extension
 * @param {String} ext            Extension of the file
 * @param {String} locale         Locale directory name
 * @param {Boolean} acceptGzip    Indicates whether user can decompress Gzip
 * @return {String}               Return the path or false if not cached
 */
function getCachedFilePath(requestPath, ext, locale, acceptGzip)
{
  if (!isCache)
    return false;

  const resourcePath = path.join(contentDir, requestPath) + ext;
  const htmlPath = path.join(contentDir, locale, requestPath) + staticExt;
  const bothEndSupportGzip = gzip && acceptGzip;

  if (bothEndSupportGzip && fileExistsSync(resourcePath + gzipExt))
    return resourcePath + gzipExt;
  else if (fileExistsSync(resourcePath))
    return resourcePath;
  else if (bothEndSupportGzip && fileExistsSync(htmlPath + gzipExt))
    return htmlPath + gzipExt;
  else if (fileExistsSync(htmlPath))
    return htmlPath;
  else
    return false;
}

/**
 * Find if the file with the suported extension exists in the path
 * @param  {String} page  ex.: documentation/internationalization/index
 * @return {String}       ex.: .md
 */
function findExtension(page)
{
  return pageExtestions.filter((ext) =>
    existsSync(path.join(pageDir, page) + ext))[0];
}

/**
 * Writes/sends 200 OK response
 * @param {Object} res ServerResponse
 * @param {String/stream.Readable} data Response data
 * @param {String} encoding of the response
 * @param {String} type Content-Type of the response
 */
function writeResponse(res, data, encoding, type)
{
  // Prevent writing head when generating static website
  if (isStatic)
    return;

  // No HTTP Status Code on a response is always 200
  res.setHeader("Content-Type", type);
  if (data instanceof stream.Readable)
    data.pipe(res);
  else
    res.end(data, encoding);
}

/**
 * Write/responde with the error
 * @param {Object} res ServerResponse
 * @param {String} code Error code
 * @param {String} message Error message
 */
function writeError(res, code, message)
{
  if (isStatic)
  {
    popFromStaticStack();
    return;
  }

  res.statusCode = code;
  res.end(...message ? [message, "utf-8"] : []);
}

/**
 * Requests 404 error page
 * @param {Object} req ClientRequest
 * @param {Object} res ServerResponse
 */
function request404Page(req, res)
{
  req.url = "/404";
  onRequest(req, res);
}

module.exports = {runServer, generateStatic};
