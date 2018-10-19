"use strict";

const path = require("path");
const {pageDir} = require("../config").dirs;

/**
 * Parse HTML tag attributes
 * @param  {String} text Text inside of the HTML tag
 * @return {Object}      Attributes Map ex.:
 *                       { href: '"/about"', class: '"highlighted button"',
 *                       required: '' }
 */
let parseAttributes = (text) =>
{
  let attributeMap = {};
  let attribute = "";
  let value = "";
  let previouseChar = "";
  let insideValue = false;
  let quotation = null;
  for (let char of text.trim())
  {
    if (insideValue)
    {
      if (char == quotation && previouseChar != "\\")
      {
        insideValue = false;
        attributeMap[attribute] = value;
        attribute = "";
        value = "";
      }
      else
      {
        value += char;
      }
    }
    else if (previouseChar == "=" && (char == "'" || char == '"'))
    {
      insideValue = true;
      quotation = char;
    }
    else if (char == " ")
    {
      if (attribute)
      {
        attributeMap[attribute] = "";
        attribute = "";
      }
    }
    else if (char != "=")
    {
      attribute += char;
    }
    previouseChar = char;
  }
  if (attribute)
    attributeMap[attribute] = "";

  return attributeMap;
};

/**
 * Find deep nested value in the object
 * @param  {Array} attributes   Deep nested path
 * @param  {Object} obj         A deep nested object
 * @return {Object}             Returns searchable values, or null
 */
let getDeepValue = (attributes, obj) =>
{
  let attribute;
  while (attributes.length > 0)
  {
    attribute = attributes.shift();
    obj = obj[attribute];

    if (!obj)
      return null;
  }

  return obj;
};

/**
 * Remove index part from the page
 * @param  {String}   page  Path to the page
 * @return {String}
 */
const removeIndex = (page) =>
{
  const {dir, name} = path.parse(page);
  let pathname = dir;
  if (name != "index")
    pathname = path.join(pathname, name);
  return pathname;
};

/**
 * Get pathname from the full path to the page
 * @param {String} filePath Full path to the page
 */
const getOriginalPathname = (filePath) =>
{
  return removeIndex(path.relative(pageDir, filePath));
};

/**
 * Extract path from filepath or from the permalink
 * @param {String} pagePath path to the page
 * @param {String} attributes Front Matter attriutes of the page
 */
const getPathname = (pagePath, attributes) =>
{
  if (attributes.permalink)
    return attributes.permalink;
  else
    return getOriginalPathname(pagePath);
};

module.exports = {parseAttributes, getDeepValue, removeIndex,
  getOriginalPathname, getPathname};
