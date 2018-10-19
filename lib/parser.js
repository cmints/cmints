"use strict";

const {promisify} = require("util");
const fs = require("fs");
const path = require("path");
const readFile = promisify(fs.readFile);
const ejs = require("ejs");
const ejsRender = promisify(ejs.renderFile);
const frontMatter = require("front-matter");
const i18n = require("./i18n");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItEntities = require("markdown-it-html-entities");
const {getPathname} = require("./custom-utils");
const {queryPages} = require("./sitedata");

const markdownIt = require("markdown-it");
const {tocOptions} = require("./toc");

// Configurations
const config = require("../config");
const {markdownOptions, templateData} = config;
const {pageDir, layoutsDir} = config.dirs;

// Setup markdown
const markdown = markdownIt(markdownOptions).use(markdownItAnchor, tocOptions)
  .use(markdownItEntities);


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
    const pagePath = path.join(pageDir, page + ext);
    readFile(pagePath, "utf-8").then((data) =>
    {
      const pageData = frontMatter(data);
      let pageContent;

      // Add paramenters and EJS helpers to the template
      templateData.page = pageData.attributes;
      // Path of the current page without locale
      templateData.page.pathname = getPathname(pagePath,
                                               pageData.attributes);
      // Locale of the current page
      templateData.page.locale = locale;
      // Other locales current page is available in
      templateData.page.locales = i18n.getPageLocales(page);
      // Reset to generate new TOC for the markdown page
      templateData.page.markdown = {toc: {}};
      // Get available locales for a specific page
      templateData.i18n.getPageLocales = (pagePath) =>
        i18n.getPageLocales(pagePath);
      // Generate href and hreflang
      templateData.i18n.href = (pagePath) =>
        i18n.hrefAndLang(pagePath, locale).join(" ");
      // Query pages metadata
      templateData.site.queryPages = queryPages;

      // generate page content according to file type
      switch (ext)
      {
        case ".md":
          pageContent = markdown.render(pageData.body);
          break;
        case ".ejs":
          pageContent = ejs.render(pageData.body, templateData);
          break;
        default:
          pageContent = pageData.body;
      }

      // Content of the page
      templateData.page.body = pageContent;
      // render theme with generated data
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
};

module.exports = {parsePage};
