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
  ".md": {encoding: "utf-8", type: "text/html"},
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

const noop = () => {};

const removeLocalePrefix = (subject, locale) => {
  const parts = subject.split(path.sep).filter(part => part && part !== locale);

  return path.join(...parts);
};

const getLocaleMiddleware = useMultiLang => {
  if (!useMultiLang) //TODO replace url with a pathname to avoid messing with query parameters
    return (req, res, next) => next();

  return (req, res, next) => {
    const pathname = url.parse(req.url).pathname;
    req.locale = getLocaleFromPath(pathname);

    // Prefer accept-language header if no locale in the path
    if (!req.locale) {
      const acceptLanguage = getHeaders(req)["accept-language"];
      req.locale = getLocaleFromHeader([defaultLocale, ...getPageLocales(pathname)], acceptLanguage);
    }

    req.url = removeLocalePrefix(pathname, req.locale);

    next();
  };
};

const tryServe = (req, res, next) => {
  const pathname = url.parse(req.url).pathname;
  const {dir, name, ext} = path.parse(pathname);

  //Do not allow to request index page explicitly by the name
  if (name === "index" && !ext) {
    req.page = "@404";
    req.url = "@404";
  }

  let tryFiles = [
    req.page,
    path.join(req.url, "index"),
    "@404"
  ];

  if (ext) { //For files with extensions we only try to serve a file itself
    tryFiles = [req.page];
  }

  const tryer = tryFiles.reduce((pro, url) => {
    return pro.then(_ => {
      if (res.served) //TODO might make sense to use the promises for that
        return Promise.reject();

      req.page = url;
    })
    .then(next)
    .catch(noop)
      
  }, Promise.resolve());

  //Catch-all case to respond with a generic 404
  tryer.then(() => {
    if (!res.served)
      writeError(res, 404)
  });
};

const getStaticServerMiddleware = staticResources =>
  (req, res, next) => {
    if (req.url[0] === "@")
      return next();

    const staticFile = path.join(publicDir, req.url);
    if (!fileExistsSync(staticFile)) {
      //TODO this might be a problem because we have to either serve a file if it looks like a file
      //or return the error early
      return next();
    }

    const ext = path.parse(staticFile).ext || ".txt";
    const {encoding, type} = staticResources[ext] || {};
    if (!type) { //this file type is not supported
      res.served = true;
      return writeError(res, 501);
    }

    const readStream = fs.createReadStream(staticFile);
    writeResponse(res, readStream, encoding, type);
    console.log('Served static: ', staticFile);

    res.served = true;

    //TODO Move this to a separate location, caching should not be here
    //TODO check if it works with concurrent requests
    if (isCache) {
      const cachePath = path.join(contentDir, req.url);
      cacheFile(cachePath, readStream);
    }
  };

const detectRequestedPage = (req, res, next) => {
  if (req.url[0] === "@")
    return next();


  const page = url.parse(req.url).pathname;
  
  //Do not allow to serve the original location
  //if the page has a permalink
  if (isPagePermalinked(page)) {
    req.url = "@404";
    return next();
  }

  const permalink = getPermalinkedPage(page);

  req.page = permalink || page;
  req.url = permalink || req.url;

  next();
};

const detectLocale = getLocaleMiddleware(multiLang);
const serveStatic = getStaticServerMiddleware(staticResourcesMap);
const requestHandler = composeMiddleware(logRequestUrl, detectLocale, detectRequestedPage, tryServe, serveStatic, onRequest);

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
function onRequest(req, res, next)
{
  let {locale, page} = req;

  if (req.url === "@404" || page === "@404") {
    res.statusCode = 404;
    page = "404";
    locale = defaultLocale;
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
    res.served = true;
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
    res.served = true;
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
    res.served = true;
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
      requestHandler({url}, {});
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
