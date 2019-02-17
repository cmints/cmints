"use strict";

const {templateData} = require("../config");
const slugifyText = require("slugify");
const i18n = require("./i18n");
const {resolveOriginalPage} = require("./sitedata");
const path = require("path");

let tocStartLevel = 0;

/**
 * Creates markdownItAnchor options to extract translation stringID and slugify
 * Heading text, see -> https://www.npmjs.com/package/markdown-it-anchor#usage
 */

/**
 * uses StringID if exist otherwise slugifies Heading text
 * @param  {String} text Markdown Heading text
 * @return {String}
 */
const slugify = (text) =>
{
  const result = i18n.getStringId(text);
  if (result)
    return result;
  else
    return slugifyText(text, {lower: true}).toString();
};

/**
 * Translates the TOC heading text, which might also contain translation strings
 * @param {String} message  message for translation
 * @param {String} pathname page pathname
 * @param {String} locale   translation locale
 */
function translateClearTags(message, pathname, locale)
{
  let page = resolveOriginalPage(pathname);

  if (i18n.isTranslated(path.join(pathname, "index"), locale))
    page = path.join(pathname, "index");
  return i18n.translate(message, page, locale);
}

/**
 * TOC generation helper, creates tree array, where ID is slugified markdown
 * Heading ex: [{id, children: [{id, children:...}, {id, children: ...}]
 * @param {Object} token additional information including tag name
 * @param {Object} info contain slug and actual title
 */
const generateToc = (token, info) =>
{
  let {toc} = templateData.page.markdown;
  let headingLevel = Number(token.tag[1]);

  // Check if the object is empty - first call for page
  if (Object.keys(toc).length === 0)
    tocStartLevel = headingLevel;

  // Top level heading might be ex: h2
  for (let i = 1; i < tocStartLevel; i++)
    headingLevel--;

  if (headingLevel <= 0)
    return;

  while (--headingLevel)
  {
    if (!toc.children)
    {
      toc.children = [];
    }

    if (Array.isArray(toc))
    {
      toc = toc[toc.length - 1];
    }
    else
    {
      toc = toc.children[toc.children.length - 1];
    }
  }
  const translatedTitle = translateClearTags(info.titleFix,
                                             templateData.page.pathname,
                                             templateData.page.locale);
  // remove the translation tags, ex.: <a1>...</a1>
  const text = translatedTitle.replace(/<(?:.|\n)*?>/gm, "");
  const newItem = {id: info.slug, text};
  if (Array.isArray(toc))
  {
    toc.push(newItem);
  }
  else
  {
    if (!toc.children)
      toc.children = [];
    toc.children.push(newItem);
  }
};

module.exports = {tocOptions: {slugify, callback: generateToc}};
