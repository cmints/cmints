"use strict";

const {promisify} = require("util");
const fs = require("fs");
const path = require("path");
const url = require("url");
const {getLocaleFromPath, isTranslated, translate, getPageLocales,
  getLocaleFromHeader} = require("../lib/i18n");
const {existsSync} = fs;
const {parsePage} = require("../lib/parser");
const {getPermalinkedPage, isPagePermalinked} = require("../lib/sitedata");
const {ensureDirSync} = require("fs-extra");
const glob = promisify(require("glob").glob);
const stream = require("stream");
const {Readable} = stream;
const {composeMiddleware, logRequestUrl} = require("../lib/middlewares");
// Configurations
const config = require("../config");
const {pageExtestions, multiLang, gzip} = config;
const {defaultLocale} = config.i18nOptions;
const {publicDir, pageDir, contentDir, localesDir} = config.dirs;
const fileStat = promisify(fs.stat);
const zlib = require("zlib");
const gzipExt = ".gzip";
const staticExt = ".html";
let staticGenCallback = null;

const compiledResourcesMap = {
  ".ejs": {encoding: "utf-8", type: "text/html"},
  ".md": {encoding: "utf-8", type: "text/html"}
};

const staticResourcesMap = {
  ".html": {encoding: "utf-8", type: "text/html"},
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

const resourcesMap = {...compiledResourcesMap, ...staticResourcesMap};

// Caching the request
let isCache = false;
// Static content generation
let isStatic = false;
// Static content generation stack
let staticStack = [];

const getLocaleMiddleware = useMultiLang => {
  if (!useMultiLang)
    return (req, res, next) => next();

  return (req, res, next) => {
    req.locale = getLocaleFromPath(req.url);

    // Prefer accept-language header if no locale in the path
    if (!req.locale) {
      const page = url.parse(req.url).pathname;
      const acceptLanguage = getHeaders(req)["accept-language"];
      req.locale = getLocaleFromHeader([defaultLocale, ...getPageLocales(page)], acceptLanguage);
    }

    next();
  };
};

const getStaticServerMiddleware = staticResources =>
  (req, res, next) => {
    if (req.url === "@404")
      next();

    const staticFile = path.join(publicDir, req.url);
    const {ext} = path.parse(staticFile);
    const {encoding, type} = staticResources[ext] || {};
    if (!type) { //this file type is not supported
      return next();
    }

    if (!fileExistsSync(staticFile)) {
      req.url = "@404";
      return next();
    }

    const readStream = fs.createReadStream(staticFile);
    writeResponse(res, readStream, encoding, type);
    console.log('Served static: ', staticFile);

    //TODO Cache?
    //cacheFile(path.join(contentDir, page) + ext, readStream);

  };

const detectRequestedPage = (req, res, next) => {
  if (req.url === "@404")
    next();

  const page = url.parse(req.url).pathname;
  let {dir, name} = path.parse(page);

  //It's not allowed to request index page explicitly by the name
  if (name === "index") {
    req.url = "@404";
    return next();
  }

  if (name === req.locale || !name) {
    req.page = "index";
    return next();
  }

  const basePath = dir.split(path.sep).filter(part => part && part !== req.locale);
  req.page = path.join(...basePath, name);

  console.log(req.page);

  next();
};

const detectPermalinkedPage = (req, res, next) => {
  if (req.url === "@404")
    next();

  const {page} = req;

  //Do not allow to serve the original location
  //if the page has a permalink
  if (isPagePermalinked(page)) {
    req.url = "@404";
    return next();
  }

  const permalink = getPermalinkedPage(page);

  if (permalink)
    req.page = permalink;

  next();
};

const detectLocale = getLocaleMiddleware(multiLang);
const serveStatic = getStaticServerMiddleware(staticResourcesMap);
const requestHandler = composeMiddleware(logRequestUrl, detectLocale, serveStatic, detectRequestedPage, detectPermalinkedPage, onRequest);

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
    server = require("https").createServer(options, requestHandler);
  }
  else
  {
    server = require("http").createServer(requestHandler);
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

/**
 * requestListener
 * @param {Object} req ClientRequest
 * @param {Object} res ServerResponse
 */
function onRequest(req, res)
{
  let {locale, page} = req;

  if (req.url === "@404") {
    res.statusCode = 404;
    page = "404";
  }

  const ext = findExtension(page); //Static with the explicit extension should be served outside this middleware

  let {encoding, type} = resourcesMap[ext] || {};
  if (!ext)
  {
    // ext = "";
    // Fallback for files without extensions
    ({encoding, type} = resourcesMap[".txt"]);
  }

  let cachePath;
  // Not supported types
  if (!encoding || !type)
  {
    writeError(res, 501);
  }
  else if (isCache &&
          (cachePath = getCachedFilePath(page, ext, locale, acceptGzip(req))))
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
        const filePath = path.join(contentDir, locale, page) + staticExt;
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
      staticStack.push(staticPath);
      staticStack.push(staticPath + gzipExt);
    }

    for (let file of files)
    {
      for (const locale of locales)
      {
        file = file.replace(pageDir, "");
        let {dir, name} = path.parse(file);
        const staticPath = path.join(contentDir, locale, dir, name) + staticExt;
        staticStack.push(staticPath);
        staticStack.push(staticPath + gzipExt);

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
    staticStack.pop();
    // Remove also gzip
    staticStack.pop();
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
  req.url = "@404";
  onRequest(req, res);
}

module.exports = {runServer, generateStatic};
