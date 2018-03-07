// Paths
const srcPath = "./src";
const pageDir = `${srcPath}/pages`;
const assetsDir = `${srcPath}/assets`;
const themeDir = `${srcPath}/theme`;
const layoutsDir = `${themeDir}/layouts`;
const partialsDir = `${themeDir}/partials`;
const lessDir = `${themeDir}/less`;
const lessTargetDir = `${assetsDir}/css`;

// Supported Page extensions
const pageExtestions = [".md", ".ejs", ".html"];

// Default data passed to the template
const templateData =
{
  site: {
    title: "I18n CMS",
    description: "CMS with the internationalization in mind"
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
  quotes: '“”‘’'
};

exports.srcPath = srcPath;
exports.pageDir = pageDir;
exports.themeDir = themeDir;
exports.layoutsDir = layoutsDir;
exports.partialsDir = partialsDir;
exports.lessDir = lessDir;
exports.lessTargetDir = lessTargetDir;
exports.assetsDir = assetsDir;
exports.templateData = templateData;
exports.markdownOptions = markdownOptions;
exports.pageExtestions = pageExtestions;
