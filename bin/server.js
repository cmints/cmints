const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");
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
const pageExtestions = ["md", "ejs", "html"];
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
});

let mimeTypes = {
  "html": "text/html",
  "ejs": "text/html",
  "md": "text/html",
  "js": "text/javascript",
  "css": "text/css",
  "json": "application/json",
  "png": "image/png",
  "jpg": "image/jpg",
  "gif": "image/gif",
  "wav": "audio/wav",
  "mp4": "video/mp4",
  "woff": "application/font-woff",
  "ttf": "application/font-ttf",
  "eot": "application/vnd.ms-fontobject",
  "otf": "application/font-otf",
  "svg": "application/image/svg+xml"
};

i18n.init((err, ready) =>
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
    ext = page.split(".").pop();
  }
  else
  {
    ext = pageExtestions.filter((ext) => 
      fileExist(`${pageDir}/${page}.${ext}`))[0];
    page += `.${ext}`;
  }

  if (pageExtestions.includes(ext))
  {
    parseTemplate(`${pageDir}/${page}`, ext).then((html) =>
    {
      html = i18n.translate(html, page, locale);
      writeResponse(res, html, ext);
    }).catch(reason =>
    {
      if(reason.code == "ENOENT")
        resourceNotFound(res);
    });
  }
  else
  {
    readFile(`${srcPath}/${page}`, "utf-8").then((data) =>
    {
      writeResponse(res, data, ext);
    }).catch(reason =>
    {
      if(reason.code == "ENOENT")
        resourceNotFound(res);
    });
  }
}

function parseTemplate(page, ext)
{
  return new Promise((resolve, reject) =>
  {
    readFile(page, "utf-8").then((data) =>
    {
      const pageData = frontMatter(data);
      let pageContent;
      templateConfig.page = pageData.attributes;

      // generate page content according to file type
      switch (ext)
      {
        case "md":
          pageContent = markdown.render(pageData.body);
          break
        case "ejs":
          pageContent = ejs.render(pageData.body);
          break
        default:
          pageContent = pageData.body;
      }

      // render themes with page contents
      let layout = pageData.attributes.theme || "default";
      templateConfig.body = pageContent;

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

function writeResponse(res, data, ext)
{
  res.writeHead(200, { "Content-Type": mimeTypes[ext] });
  res.end(data, "utf-8");
}

function resourceNotFound(res)
{
  res.writeHead(404);
  res.end();
}
