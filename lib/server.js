const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const url = require('url');
const {getLocaleFromPath, isTranslated, translate} = require("../lib/i18n");
const readFile = promisify(fs.readFile);
const fileExist = fs.existsSync;
const {parsePage} = require("../lib/parser");
const outputFile = promisify(require("fs-extra").outputFile);
const ensureDirSync = require("fs-extra").ensureDirSync;
const glob = promisify(require("glob").glob);
const stream = require("stream");
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

  server.listen(port);

  if (isHttps)
  {
    redirectHTTP();
  }
}

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

/**
 * requestListener
 * @param {Object} req ClientRequest
 * @param {Object} res ServerResponse
 */
function onRequest(req, res)
{
  let page = url.parse(req.url).pathname;
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
    const readStream = fs.createReadStream(cachePath);
    writeResponse(res, readStream, encoding, type);
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
        cacheFile(path.join(contentDir, locale, page) + ".html", html);
    }).catch((reason) =>
    {
      if(reason.code == "ENOENT") // No such file 
      {
        writeError(res, 404);
      }
      else
      {
        writeError(res, 500, reason.message); // 500 Internal Server Error
      }
    });
  }
  else if (fileExist(path.join(publicDir, page) + ext))
  {
    const readStream = fs.createReadStream(path.join(publicDir, page) + ext);
    writeResponse(res, readStream, encoding, type);

    // Cache
    if (isCache)
      cacheFile(path.join(contentDir, page) + ext, readStream);
  }
  else
  {
    writeError(res, 404);
  }
}

/**
 * Caching file in the Server 
 * @param {String} filePath path to the caching destination
 * @param {String/stream.Readable} data data of the file
 * @param {String} encoding file encoding
 */
function cacheFile(filePath, data, encoding)
{
  const fileCached = () =>
  {
    if (isStatic)
    {
      console.log(`${filePath} generated`);
      staticStack.pop();
      if (!staticStack.length)
        process.exit();
    }
    else
    {
      console.log(`${filePath} cached`);
    }
  };
  if (data instanceof stream.Readable)
  {
    ensureDirSync(path.parse(filePath).dir);
    const writeStream = fs.createWriteStream(filePath);
    writeStream.on("finish", fileCached);
    writeStream.on("error", console.error);
    data.pipe(writeStream);
  }
  else
    outputFile(filePath, data, {encoding}).then(fileCached);
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
    return;
  }

  res.statusCode = code;
  res.end.apply(res, message ? [message, "utf-8"] : []);
}

exports.runServer = runServer;
exports.generateStatic = generateStatic;
