const {promisify} = require("util");
const path = require("path");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const ejs = require("ejs");
const ejsRender = promisify(ejs.renderFile);
const frontMatter = require("front-matter");
const i18n = require("./i18n");
const markdownItAnchor = require("markdown-it-anchor");

const {getSitemap} = require("../lib/sitemap");

const markdownIt = require("markdown-it");
const {tocOptions} = require("./toc");

// Configurations
const config = require("../config");
const {markdownOptions, templateData} = config;
const {pageDir, layoutsDir} = config.dirs;

// Setup markdown
const markdown = markdownIt(markdownOptions).use(markdownItAnchor, tocOptions);

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
      templateData.page = pageData.attributes;
      // Path of the current page without locale
      templateData.page.path = removeIndex(page);
      // Locale of the current page
      templateData.page.locale = locale;
      // Other locales current page is available in
      templateData.page.locales = i18n.getPageLocales(page);
      // Reset to generate new TOC for the page
      templateData.page.toc = {};
      // Get available locales for a specific page
      templateData.i18n.getPageLocales = (pagePath) =>
        i18n.getPageLocales(pagePath);
      // Generate href and hreflang
      templateData.i18n.href = (pagePath) =>
        i18n.hrefAndLang(pagePath, locale).join(" ");
      // Get sitemap for a specific page
      templateData.site.getSitemap = (pagePath) => getSitemap(pagePath);

      // generate page content according to file type
      switch (ext)
      {
        case ".md":
          pageContent = markdown.render(pageData.body);
          break
        case ".ejs":
          pageContent = ejs.render(pageData.body, templateData);
          break
        default:
          pageContent = pageData.body;
      }

      // render theme with page contents
      templateData.body = pageContent;
      let layout = pageData.attributes.layout || "default";
      return ejsRender(`${layoutsDir}/${layout}.ejs`, templateData);
    }).then((html) =>
    {
      resolve(html);
    }).catch(reason =>
    {
      reject(reason);
    });
  });
}

/**
 * Remove index part from the page
 * @param  {String}   page  Path to the page
 * @return {String}
 */
function removeIndex(page)
{
  if (page == "index")
    return "";

  page = page.split(path.sep);
  if (page[page.length -1] == "index")
    page.pop();
  return path.join(...page);
}

module.exports = {parsePage};
