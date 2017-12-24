const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");
const ejs = require("ejs");
const ejsRender = promisify(ejs.renderFile);
const frontMatter = require("front-matter");
const locales = ["en", "ru", "de"];
const defaultLocale = "en";
const {walkDirs} = require("../lib/custom-utils");
const walker = promisify(require("../lib/custom-utils").walker);
const i18n = require("../lib/i18n");
const readFile = promisify(fs.readFile);
const fileExist = fs.existsSync;
const extensions = ["md", "ejs", "html"];
const srcPath = "./src";
const pageDir = `${srcPath}/pages`;
let stringsTree = {};


// Default website data
let templateConfig = {
  site: {
    title: "Website title",
    description: "Website descriptio"
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

i18n.getStringsTree((err, tree)=>
{
  stringsTree = tree;
  createServer(onRequest).listen(5000);
});

function onRequest(req, res)
{

  let page = req.url;
  page = page.split("/").slice(1);
  let locale = locales.includes(page[0]) ? page.shift() : defaultLocale;
  page = page.join("/");

  let ext = "";
  if (page.includes("."))
  {
    ext = page.split(".").pop()[0];
  }
  else
  {
    ext = extensions.filter((ext) => fileExist(`${pageDir}/${page}.${ext}`))[0];
    page += `.${ext}`;
  }

  readFile(`${pageDir}/${page}`, "utf-8").then((data) =>
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

    // render layout with page contents
    const layout = pageData.attributes.layout || "default";

    templateConfig.body = pageContent;

    return ejsRender(`${srcPath}/layouts/${layout}.ejs`, templateConfig);
  }).then((html) =>
  {
    let translationSelector = /{(\w[\w-]*)(\[.*\])?\s([^\}]+)}/g;
    let match;
    let translatedHtml = html;

    while ((match = translationSelector.exec(html)) != null)
    {
      let [translation, stringId, description, message] = match;
      if (description)
      {
        description = description.substring(1, --description.length);
        translationSelector.lastIndex -= description.length;
      }

      if (locale != defaultLocale)
      {
        let jsonPage = page.substr(0, page.lastIndexOf(".")) + ".json";
        let pageObj = stringsTree[jsonPage];
        let messages;
        if (pageObj)
          messages = pageObj[locale];
        if (messages && messages[stringId])
        {
          translationSelector.lastIndex -= message.length;
          message = messages[stringId].message;
          translationSelector.lastIndex += message.length;
        }
      }
      translationSelector.lastIndex -= stringId.length + 3;
      html = html.replace(translation, message);
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html, "utf-8");
  });
}

function monitoring(type, filename)
{
  //server.destroy();
  //server.close(() => server.listen(5000));
}

/*
walkDirs(["./src", "./lib", "./bin"], (err, files)=>
{
  for (let file of files)
    fs.watch(file, monitoring);
});
*/
