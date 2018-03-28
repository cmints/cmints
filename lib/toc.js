const {templateData} = require("../config");
const string = require("string");
const i18n = require("./i18n");

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
    return string(text).slugify().toString();
}

/**
 * TOC generation helper, creates tree array, where ID is slugified markdown
 * Heading ex: [{id, children: [{id, children:...}, {id, children: ...}]
 * @param {Object} token additional information including tag name
 * @param {Object} info contain slug and actual title
 */
const generateToc = (token, info) =>
{
  let toc = templateData.toc;
  let headingLevel = Number(token.tag[1]);
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

exports.tocOptions = {slugify, callback: generateToc};
