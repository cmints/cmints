const argv = require("minimist")(process.argv.slice(2));
const path = require("path");

const src = argv.src || argv._.shift();
// Directories
const srcPath = src ? path.relative("", src) : ".";
const contentDir = `${srcPath}/content`;
const themeDir = `${srcPath}/theme`;
const publicDir = `${srcPath}/public`;
let multiLang = true;

const dirs = 
{
  srcPath, contentDir, publicDir, themeDir,
  pageDir: `${srcPath}/pages`,
  layoutsDir: `${themeDir}/layouts`,
  lessDir: `${themeDir}/less`,
  lessTargetDir: `${publicDir}/css`,
  browserifyDir: `${themeDir}/js`,
  browserifyTargetDir: `${publicDir}/js`,
  localesDir: `${srcPath}/locales`,
  tempDir: `${srcPath}/temp`
};

// Default port
let port = {
  https: 4000,
  http: 3000
};
let hostname = "127.0.0.1";

// i18n configuration
i18nOptions = {
  defaultLocale: "en",
  prefix: "{",
  postfix: "}",
  // crowdinProject
  crowdinId: null
};

// Supported Page extensions
const pageExtestions = [".md", ".ejs", ".html"];

// Default data passed to the template
let templateData =
{
  site: {
    title: "CMintS",
    description: "CMS created with the internationalization in mind"
  },
  page: {},
  i18n: {}
};

// Markdown configuration
// See https://markdown-it.github.io/markdown-it/#MarkdownIt.new
let markdownOptions =
{
  html:         true,
  xhtmlOut:     false,
  breaks:       false,
  langPrefix:   "language-",
  linkify:      false,
  typographer:  false,
  quotes: '“”‘’'
};

// Loading user configurations
try {
  // Use workspace path in order to load config when installed globally
  const userConfig = require(path.resolve(`${srcPath}/config.js`));
  if (userConfig.templateData)
    templateData = Object.assign(templateData, userConfig.templateData);
  if (userConfig.markdownOptions)
    markdownOptions = Object.assign(markdownOptions, userConfig.markdownOptions);
  if (userConfig.i18nOptions)
    i18nOptions = Object.assign(i18nOptions, userConfig.i18nOptions);
  if (userConfig.port)
    port = userConfig.port;
  if (userConfig.hostname)
    hostname = userConfig.hostname;
}
catch (e) {
  if (e.code == "MODULE_NOT_FOUND")
    console.log("Info: No custom config setup, see: https://cmints.io/documentation/getting-started/configuration");
  else
    console.error(e)
}

// When localesDir doesn't exist make a single language website
if (!require("fs").existsSync(dirs.localesDir))
  multiLang = false;

module.exports = {dirs, templateData, markdownOptions, pageExtestions, port,
  hostname, i18nOptions, multiLang};
