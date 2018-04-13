const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const {getLocaleFromPath, isTranslated, translate} = require("../lib/i18n");
const readFile = promisify(fs.readFile);
const fileExist = fs.existsSync;
const {parsePage} = require("../lib/parser");
const outputFile = promisify(require("fs-extra").outputFile);
const glob = promisify(require("glob").glob);
// Configurations
const config = require("../config");
const {pageExtestions, defaultLocale} = config;
const {publicDir, pageDir, contentDir, localesDir} = config.dirs;

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
  ".svg": {encoding: "binary", type: "image/svg+xml"}
};

// Caching the request
let isCache = false;
// Static content generation
let isStatic = false;
// Static content generation stack
let staticStack = [];

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

  server.listen(port);

  // Create a http redirection
  if (isHttps)
  {
    require("http").createServer((req, res) =>
    {
      res.writeHead(301, {
        "Location": "https://" + req.headers["host"] + req.url
      });
      res.end();
    }, config.port.http);
  }
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
    writeError(res, 404);
    return;
  }

  // Do not allow index in the address
  if (!ext && name == "index")
  {
    writeError(res, 404);
    return;
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

  // Not supported types
  if (!encoding || !type)
  {
    writeError(res, 501);
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
        writeError(res, 404);
      }
      else
      {
        writeError(res, 500, reason.message);
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
    writeError(res, 404);
  }
}

function cacheFile(fileName, data, encoding)
{
  outputFile(fileName, data, {encoding}).then(() =>
  {
    if (isStatic)
    {
      console.log(`${fileName} generated`);
      staticStack.pop();
      if (!staticStack.length)
        process.exit();
    }
    else
    {
      console.log(`${fileName} cached`);
    }
  });
}

/**
 * Generates static website
 */
let generateStatic = () =>
{
  isStatic = true;
  isCache = true;

  const pages = glob(`${pageDir}/**/*.*`);
  const locales = glob(`${localesDir}/*`);
  const public = glob(`${publicDir}/**/*.*`);
  Promise.all([pages, locales, public]).then(([files, locales, publics]) =>
  {
    staticStack = [...publics];

  // Generate pages
    locales = locales.map((locale) => path.parse(locale).base);
    for (let file of files)
    {
      for (const locale of locales)
      {
        staticStack.push(file);
        file = file.replace(pageDir, "");
        let {dir, name} = path.parse(file);
        if (name == "index")
          onRequest({url: path.join("/", locale, dir)});
        else
          onRequest({url: path.join("/", locale, dir, name)});
      }
    }

    // Generate public
    for (const file of publics)
    {
      onRequest({url: file.replace(publicDir, "")});
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

function writeError(res, code, message)
{
  if (isStatic)
  {
    staticStack.pop();
    return;
  }

  res.writeHead(code);
  res.end.apply(res, message ? [message, "utf-8"] : []);
}

exports.runServer = runServer;
exports.generateStatic = generateStatic;
