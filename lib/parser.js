const {promisify} = require('util');
const path = require("path");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const glob = promisify(require("glob").glob);
const ejs = require("ejs");
const ejsRender = promisify(ejs.renderFile);
const frontMatter = require("front-matter");
const i18n = require("./i18n");

const {createSitemap, getSitemap} = require("../lib/sitemap");

const markdownIt = require("markdown-it");
const markdownItTocAndAnchor = require('markdown-it-toc-and-anchor').default;

// Configurations
const {markdownOptions, pageDir, layoutsDir, srcPath, templateData,
      pageExtestions} = require("../config");

// Setup markdown
const markdown = markdownIt(markdownOptions).use(markdownItTocAndAnchor,
  {anchorLink: false});

// Default website data
let templateConfig = templateData;


glob(`${pageDir}/**/*+(${pageExtestions.join("|")})`, {}).then((filePaths) =>
{
  filePaths = filePaths.map((filePath) => filePath.replace(`${pageDir}/`, ""));
  createSitemap(filePaths);
});

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

      // render theme with page contents
      templateConfig.body = pageContent;
      let layout = pageData.attributes.theme || "default";
      return ejsRender(`${layoutsDir}/${layout}.ejs`, templateConfig);
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
  page = page.split(path.sep);
  if (page[page.length -1] == "index")
    page.pop();
  return path.join(...page);
}

exports.parsePage = parsePage;
