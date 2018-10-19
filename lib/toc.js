"use strict";

const {templateData} = require("../config");
const slugifyText = require("slugify");
const i18n = require("./i18n");

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

  while (--headingLevel)
  {
    if (!toc.children)
      toc.children = [];
    toc = toc.children[toc.children.length - 1];
  }

  if (!toc.children)
    toc.children = [];
  toc.children.push({id: info.slug, title: info.title});
};

module.exports = {tocOptions: {slugify, callback: generateToc}};
