const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const i18n = require("../lib/i18n");
const i18nInit = promisify(i18n.init);
const lessProcessor = require("../lib/less-processor");
const readFile = promisify(fs.readFile);
const fileExist = fs.existsSync;
const {parsePage} = require("../lib/parser");
const outputFile = promisify(require("fs-extra").outputFile);

// Configurations
const {publicDir, layoutsDir, partialsDir, lessDir, lessTargetDir, pageDir,
      contentDir, srcPath, pageExtestions} = require("../config");


// Sitemap holds also the metadata information for each page.
let sitemap = {};

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
  ".woff": {encoding: "utf-8", type: "application/font-woff"},
  ".ttf": {encoding: "utf-8", type: "application/font-ttf"},
  ".eot": {encoding: "utf-8", type: "application/vnd.ms-fontobject"},
  ".otf": {encoding: "utf-8", type: "application/font-otf"},
  ".svg": {encoding: "utf-8", type: "application/image/svg+xml"}
};

let i18nWatchDirs = [pageDir, partialsDir, layoutsDir];
i18nInit(`${srcPath}/locales`, i18nWatchDirs).then((ready) =>
{
  if (ready)
    runServer();
});

lessProcessor.init(lessDir, lessTargetDir);

function runServer()
{
  let port = 4000;
  let server = createServer(onRequest);
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
  let locale = i18n.getLocaleFromPath(page);
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
  else if (cachePath = getCachedFilePath(page, ext, locale)) // Is cached
  {
    readFile(cachePath).then((data) =>
    {
      writeResponse(res, data, encoding, type);
    });
  }
  else if (pageExtestions.includes(ext))
  {
    parsePage(page, ext, locale).then((html) =>
    {
      html = i18n.translate(html, page, locale);
      writeResponse(res, html, encoding, type);
      // cache
      outputFile(path.join(contentDir, locale, page) + ".html", html, {encoding});
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
      outputFile(path.join(contentDir, page) + ext, data, {encoding});
    });
  }
  else
  {
    resourceNotFound(res);
  }
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
  res.writeHead(200, { "Content-Type": type });
  res.end(data, encoding);
}

function resourceNotFound(res)
{
  res.writeHead(404);
  res.end();
}

function resourceNotImplemented(res)
{
  res.writeHead(501);
  res.end();
}

function internalServerError(res, message)
{
  res.writeHead(500);
  res.end.apply(res, message ? [message, "utf-8"] : []);
}
