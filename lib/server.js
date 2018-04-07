const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const {getLocaleFromPath, isTranslated, translate,
      defaultLocale} = require("../lib/i18n");
const readFile = promisify(fs.readFile);
const fileExist = fs.existsSync;
const {parsePage} = require("../lib/parser");
const outputFile = promisify(require("fs-extra").outputFile);
const glob = promisify(require("glob").glob);
// Configurations
const config = require("../config");
const {pageExtestions} = config;
const {publicDir, pageDir, contentDir, localesDir} = config.dirs;

const resourcesMap = {
  ".html": {encoding: "utf-8", type: "text/html"},
  ".ejs": {encoding: "utf-8", type: "text/html"},
  ".md": {encoding: "utf-8", type: "text/html"},
  ".js": {encoding: "utf-8", type: "text/javascript"},
  ".css": {encoding: "utf-8", type: "text/css"},
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
  ".svg": {encoding: "binary", type: "application/image/svg+xml"}
};

// Caching the request
let isCache = false;
// Stops servers from responding 
let isStatic = false;

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
    server = require("http").createServer(onRequest)
  }

  let port = config.port;
  if (argv.p)
    port = Number(argv.p);

  server.on("error", (err) =>
  {
    let error = err.Error;
    if (err.code === "EADDRINUSE")
      error = `Port ${port} is in use`;

    throw error;
  });

  server.listen(port);
}

function onRequest(req, res)
{
  let page = req.url;
  let locale = getLocaleFromPath(page);
  let {dir, name, ext} = path.parse(page);
  dir = dir.split(path.sep);
  dir.shift();

  // Filter locales from the path and Name
  dir = dir.filter((part) => part != locale);
  if (name == locale)
    name = "";

  page = path.join(...dir, name);

  // Do not allow extensions in the address
  if (pageExtestions.includes(ext))
  {
    resourceNotFound(res);
    return;
  }

  // Do not allow index in the address
  if (!ext && name == "index")
  {
    resourceNotFound(res);
    return;
  }

  if (!ext && !(ext = findExtension(page)))
  {
    page = path.join(page, "index");
    ext = findExtension(page);
  }

  if (!ext)
  {
    resourceNotFound(res);
    return;
  }

  let {encoding, type} = resourcesMap[ext] || {};
  // Not supported types
  if (!encoding || !type)
  {
    resourceNotImplemented(res);
  }
  else if (isCache && (cachePath = getCachedFilePath(page, ext, locale)))
  {
    readFile(cachePath).then((data) =>
    {
      writeResponse(res, data, encoding, type);
    });
  }
  else if (pageExtestions.includes(ext) &&
          (isTranslated(page, locale) || locale === defaultLocale))
  {
    parsePage(page, ext, locale).then((html) =>
    {
      html = translate(html, page, locale);
      writeResponse(res, html, encoding, type);
      // cache
      if (isCache)
        cacheFile(path.join(contentDir, locale, page) + ".html", html, encoding);
    }).catch((reason) =>
    {
      if(reason.code == "ENOENT")
      {
        resourceNotFound(res);
      }
      else
      {
        internalServerError(res, reason.message);
      }
    });
  }
  else if (fileExist(path.join(publicDir, page) + ext))
  {
    readFile(path.join(publicDir, page) + ext, encoding).then((data) =>
    {
      writeResponse(res, data, encoding, type);
      // cache
      if (isCache)
        cacheFile(path.join(contentDir, page) + ext, data, encoding);
    });
  }
  else
  {
    resourceNotFound(res);
  }
}

function cacheFile(fileName, data, encoding)
{
  outputFile(fileName, data, {encoding}).then(() =>
  {
    console.log(`${fileName} cached`);
  });
}

/**
 * Generates static website
 */
let generateStatic = () =>
{
  isStatic = true;
  isCache = true;

  // Generate public
  glob(`${publicDir}/**/*.*`).then((files) =>
  {
    for (const file of files)
    {
      onRequest({url: file.replace(publicDir, "")});
    }
  });

  // Generate pages
  const pages = glob(`${pageDir}/**/*.*`);
  const locales = glob(`${localesDir}/*`);
  Promise.all([pages, locales]).then(([files, locales]) =>
  {
    locales = locales.map((locale) => path.parse(locale).base);
    for (let file of files)
    {
      for (const locale of locales)
      {
        file = file.replace(pageDir, "");
        let {dir, name} = path.parse(file);
        if (name == "index")
          onRequest({url: path.join("/", locale, dir)});
        else
          onRequest({url: path.join("/", locale, dir, name)});
      }
    }
  });
}

/**
 * Get the filePath if the file is cached
 * @param {String} requestPath    requestPath without extension
 * @param {String} ext            Extension of the file
 * @param {String} locale         Locale directory name
 * @return {String}               Return the path or false if not cached
 */
function getCachedFilePath(requestPath, ext, locale)
{
  const resourcePath = path.join(contentDir, requestPath);
  const htmlPath = path.join(contentDir, locale, requestPath);
  if (fileExist(resourcePath + ext))
    return resourcePath + ext;
  else if (fileExist(htmlPath + ".html"))
    return htmlPath + ".html";
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
    fileExist(path.join(pageDir, page) + ext))[0];
}

function writeResponse(res, data, encoding, type)
{
  // Prevent writing head when generating static website
  if (isStatic)
    return;

  res.writeHead(200, { "Content-Type": type });
  res.end(data, encoding);
}

function resourceNotFound(res)
{
  if (isStatic)
    return;

  res.writeHead(404);
  res.end();
}

function resourceNotImplemented(res)
{
  if (isStatic)
    return;

  res.writeHead(501);
  res.end();
}

function internalServerError(res, message)
{
  if (isStatic)
    return;

  res.writeHead(500);
  res.end.apply(res, message ? [message, "utf-8"] : []);
}

exports.runServer = runServer;
exports.generateStatic = generateStatic;
