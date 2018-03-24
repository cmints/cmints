// Paths
const srcPath = "./src";
const contentDir = `./content`;
const pageDir = `${srcPath}/pages`;
const publicDir = `${srcPath}/public`;
const themeDir = `${srcPath}/theme`;
const layoutsDir = `${themeDir}/layouts`;
const partialsDir = `${themeDir}/partials`;
const lessDir = `${themeDir}/less`;
const lessTargetDir = `${publicDir}/css`;
const localesDir = `${srcPath}/locales`;
const {getLanguage, highlight} = require("highlight.js");

// Supported Page extensions
const pageExtestions = [".md", ".ejs", ".html"];

// Default data passed to the template
const templateData =
{
  site: {
    title: "CMintS",
    description: "CMS created with the internationalization in mind"
  },
  navigations: [
      {path: "documentation", stringId: "menu-item-docs"},
      {path: "news", stringId: "menu-item-news"},
      {path: "blog", stringId: "menu-item-blog"}]
};

// See https://markdown-it.github.io/markdown-it/#MarkdownIt.new
const markdownOptions =
{
  html:         true,
  xhtmlOut:     false,
  breaks:       false,
  langPrefix:   'language-',
  linkify:      false,
  typographer:  false,
  quotes: '“”‘’',
  highlight(str, lang)
  {
    let result = (lang && getLanguage(lang)) ? highlight(lang, str).value : "";
    // Replace i18n braces to use inside of code blocks
    return result.replace(/{/g, "&#123;").replace(/}/g, "&#125;");
  }
};

exports.srcPath = srcPath;
exports.contentDir = contentDir;
exports.pageDir = pageDir;
exports.themeDir = themeDir;
exports.layoutsDir = layoutsDir;
exports.partialsDir = partialsDir;
exports.lessDir = lessDir;
exports.lessTargetDir = lessTargetDir;
exports.publicDir = publicDir;
exports.localesDir = localesDir;
exports.templateData = templateData;
exports.markdownOptions = markdownOptions;
exports.pageExtestions = pageExtestions;
