"use strict";

const path = require("path");
const separator = path.sep;
const {pageDir} = require("../config").dirs;
const {promisify} = require("util");
const globPromise = promisify(require("glob").glob);
const {serialize, deserialize} = require("v8");

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
 * Creates File System request representation from file path
 * @param {String} filePath path to the page file
 * @return {String}
 */
const pagePathFromFile = (filePath) =>
{
  const page = path.relative(pageDir, filePath);
  const {dir, name} = path.parse(page);
  let pathname = dir;
  if (name != "index")
    pathname = path.join(pathname, name);
  return pathname;
};

/**
 * Creates URL pathname from the full path to the file
 * @param {String} filePath Full path to the page
 */
const originalPathnameFromFile = (filePath) =>
{
  return pagePathFromFile(filePath).split(path.sep).join("/");
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
    return originalPathnameFromFile(pagePath);
};

/**
 * Convert URL pathname to filesystem independant path
 * @param {String} pathname URL pathname "/" separated
 * @return {String}
 */
const pathnameToPath = (pathname) =>
{
  return path.join(...(pathname.split("/")));
};

/**
 * Deep clone object. Note: don't use on objects containing Functions
 * @param {Object} obj object to be deep cloned
 */
const deepClone = (obj) => deserialize(serialize(obj));

/**
 * Joins URL pathname parts
 * @param {String} ...paths sequence of path parts
 * @return {String}
 */
const urlPathJoin = (...paths) =>
{
  return paths.filter((path) => path).join("/").replace(/\/\/+/g, "/");
};

/**
 * Make glob result paths OS independent, as glob uses unix style by default.
 * @param {String} pattern Glob pattern
 * @param {Object} options Various glob options
 * @return {Array} array of filenames
 */
const glob = (...args) =>
{
  return globPromise(...args).then((paths) => paths.map((path) =>
    path.replace(/\//g, separator)));
};

module.exports = {parseAttributes, getDeepValue, pagePathFromFile,
  originalPathnameFromFile, getPathname, pathnameToPath, urlPathJoin, glob,
  deepClone};
