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
const lessProcessor = require("../lib/less-processor");
const glob = promisify(require("glob").glob);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const walker = promisify(require("../lib/custom-utils").walker);
const fileExist = fs.existsSync;
const pageExtestions = [".md", ".ejs", ".html"];
const less = require("less");

// Path
const srcPath = "./src";
const pageDir = `${srcPath}/pages`;
const assetsDir = `${srcPath}/assets`;

// Default website data
let templateConfig = {
  site: {
    title: "I18n CMS",
    description: "CMS with the internalization done right"
  }
};

// Setup markdown
let markdown = markdownIt({
  html:         true,        // Enable HTML tags in source
  xhtmlOut:     false,        // Use '/' to close single tags (<br />).
                              // This is only for full CommonMark compatibility.
  breaks:       false,        // Convert '\n' in paragraphs into <br>
  langPrefix:   'language-',  // CSS language prefix for fenced blocks. Can be
                              // useful for external highlighters.
  linkify:      false,        // Autoconvert URL-like text to links

  // Enable some language-neutral replacement + quotes beautification
  typographer:  false,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Could be either a String or an Array.
  //
  // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
  // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
  quotes: '“”‘’',

  // Highlighter function. Should return escaped HTML,
  // or '' if the source string is not changed and should be escaped externally.
  // If result starts with <pre... internal wrapper is skipped.
  highlight: function (/*str, lang*/) { return ''; }
}).use(markdownItTocAndAnchor);

let resourcesMap = {
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

let i18nWatchDirs = [`${srcPath}/pages`, `${srcPath}/themes`,
                     `${srcPath}/partials`];

i18n.init(`${srcPath}/locales`, i18nWatchDirs, (err, ready) =>
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
  page = page.split("/").slice(1);
  let locale = i18n.getLocaleFromUrlParts(page);

  page = page.join("/");
  if (!page)
    page = "index";

  let ext = "";
  if (page.includes("."))
  {
    [page, ext] = page.split(".");
    ext = "." + ext;
  }
  else
  {
    ext = pageExtestions.filter((ext) => 
      fileExist(`${pageDir}/${page}${ext}`))[0];
  }

  let {encoding, type} = ext ? resourcesMap[ext] : {};
  if (!ext)
  {
    resourceNotFound(res);
  }
  else if (!encoding || !type)
  {
    resourceNotImplemented(res);
  }
  else if (pageExtestions.includes(ext))
  {
    parseTemplate(page, ext, locale).then((html) =>
    {
      html = i18n.translate(html, page, locale);
      writeResponse(res, html, encoding, type);
    }).catch((reason) =>
    {
      console.log(reason);
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
    readFile(`${srcPath}/${page}${ext}`, encoding).then((data) =>
    {
      writeResponse(res, data, encoding, type);
    }).catch(reason =>
    {
      if(reason.code == "ENOENT")
        resourceNotFound(res);
    });
  }
}

function parseTemplate(page, ext, locale)
{
  return new Promise((resolve, reject) =>
  {
    readFile(`${pageDir}/${page}${ext}`, "utf-8").then((data) =>
    {
      const pageData = frontMatter(data);
      let pageContent;

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
          pageContent = ejs.render(pageData.body);
          break
        default:
          pageContent = pageData.body;
      }

      // render themes with page contents
      templateConfig.page = pageData.attributes;
      templateConfig.body = pageContent;
      templateConfig.currentPage = page;
      templateConfig.currentLocale = locale;
      templateConfig.href = (pagePath) =>
        i18n.hrefAndLang(pagePath, locale).join(" ");
      templateConfig.getPageLocales = (pagePath) =>
        i18n.getPageLocales(pagePath ? pagePath : page, locale);

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
