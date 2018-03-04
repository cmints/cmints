const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");
const markdownItTocAndAnchor = require('markdown-it-toc-and-anchor').default;
const ejs = require("ejs");
const ejsRender = promisify(ejs.renderFile);
const frontMatter = require("front-matter");
const i18n = require("../lib/i18n");
const i18nInit = promisify(i18n.init);
const lessProcessor = require("../lib/less-processor");
const glob = promisify(require("glob").glob);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const walker = promisify(require("../lib/custom-utils").walker);
const fileExist = fs.existsSync;
const pageExtestions = [".md", ".ejs", ".html"];
const less = require("less");
const {createSitemap, getSitemap} = require("../lib/sitemap");

// Configurations
const {assetsDir, markdownOptions, pageDir, srcPath, templateData} = require("../config");

// Setup markdown
const markdown = markdownIt(markdownOptions).use(markdownItTocAndAnchor);
// Sitemap holds also the metadata information for each page.
let sitemap = {};
// Default website data
let templateConfig = templateData;


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

let i18nWatchDirs = [`${pageDir}`, `${srcPath}/themes`, `${srcPath}/partials`];

glob(`${pageDir}/**/*+(${pageExtestions.join("|")})`, {}).then((filePaths) =>
{
  filePaths = filePaths.map((filePath) => filePath.replace(`${pageDir}/`, ""));
  createSitemap(filePaths);
});

i18nInit(`${srcPath}/locales`, i18nWatchDirs).then((ready) =>
{
  if (ready)
    runServer();
});

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

lessProcessor.init(`${srcPath}/less`, `${assetsDir}/css`);

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
  else if (pageExtestions.includes(ext))
  {
    parsePage(page, ext, locale).then((html) =>
    {
      html = i18n.translate(html, page, locale);
      writeResponse(res, html, encoding, type);
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
  else
  {
    readFile(path.join(srcPath, page) + ext, encoding).then((data) =>
    {
      writeResponse(res, data, encoding, type);
    }).catch(reason =>
    {
      if(reason.code == "ENOENT")
        resourceNotFound(res);
    });
  }
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
 * Remove index part from the page
 * @param  {String}   page  Path to the page
 * @return {String}
 */
function removeIndex(page)
{
  page = page.split(path.sep);
  if (page[page.length -1] == "index")
    page.pop();
  return path.join(...page);
}

/**
 * Parse page according to the extension and passes various parameters to the
 * template
 * @param  {String} page   Path to the page in pages directory (without ext.)
 * @param  {String} ext    Extension of the file -> [".md", ".ejs", ".html"]
 * @param  {String} locale Locale of the request, used to pass various
 *                         parameters to the template
 * @return {Promise}       Promise object
 */
let parsePage = (page, ext, locale) =>
{
  return new Promise((resolve, reject) =>
  {
    readFile(`${pageDir}/${page}${ext}`, "utf-8").then((data) =>
    {
      const pageData = frontMatter(data);
      let pageContent;

      // Add paramenters and EJS helpers to the template
      templateConfig.page = pageData.attributes;
      templateConfig.href = (pagePath) =>
        i18n.hrefAndLang(pagePath, locale).join(" ");
      templateConfig.currentPage = removeIndex(page);
      templateConfig.currentLocale = locale;
      templateConfig.getSitemap = (url) => getSitemap(url);
      templateConfig.getPageLocales = (pagePath) =>
        i18n.getPageLocales(pagePath ? pagePath : page, locale);

      // generate page content according to file type
      switch (ext)
      {
        case ".md":
          pageContent = markdown.render(pageData.body, {
            tocCallback: (tocMarkdown, tocArray, tocHtml) =>
            {
              templateConfig.toc = tocHtml;
            }
          });
          break
        case ".ejs":
          pageContent = ejs.render(pageData.body, templateConfig);
          break
        default:
          pageContent = pageData.body;
      }

      // render themes with page contents
      templateConfig.body = pageContent;
      let layout = pageData.attributes.theme || "default";
      return ejsRender(`${srcPath}/themes/${layout}.ejs`, templateConfig);
    }).then((html) =>
    {
      resolve(html);
    }).catch(reason =>
    {
      reject(reason);
    });
  });
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

exports.parsePage = parsePage;
