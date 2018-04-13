// Directories
const srcPath = "./src";
const contentDir = "./content";
const themeDir = `${srcPath}/theme`;
const publicDir = `${srcPath}/public`;
const dirs = 
{
  srcPath, contentDir, publicDir, themeDir,
  pageDir: `${srcPath}/pages`,
  layoutsDir: `${themeDir}/layouts`,
  lessDir: `${themeDir}/less`,
  lessTargetDir: `${publicDir}/css`,
  localesDir: `${srcPath}/locales`
};

// Default port
const port = {
  https: 4000,
  http: 3000
};

// I18n configuration
let defaultLocale = "en";

// Supported Page extensions
const pageExtestions = [".md", ".ejs", ".html"];

// Default data passed to the template
let templateData =
{
  site: {
    title: "CMintS",
    description: "CMS created with the internationalization in mind"
  }
};

// Markdown configuration
const {getLanguage, highlight} = require("highlight.js");
// See https://markdown-it.github.io/markdown-it/#MarkdownIt.new
let markdownOptions =
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


// Loading user configurations
try {
  const userConfig = require(`${srcPath}/config`);
  if (userConfig.templateData)
    templateData = Object.assign(templateData, userConfig.templateData);
  if (userConfig.markdownOptions)
    markdownOptions = Object.assign(markdownOptions, userConfig.markdownOptions);
  if (userConfig.defaultLocale)
    defaultLocale = userConfig.defaultLocale;
}
catch (e) {
  if (e.code == "MODULE_NOT_FOUND")
    console.log("Info: No custom config setup");
  else
    console.error(e)
}


exports.dirs = dirs;
exports.templateData = templateData;
exports.markdownOptions = markdownOptions;
exports.pageExtestions = pageExtestions;
exports.port = port;
exports.defaultLocale = defaultLocale;
