const fs = require("fs");
const {promisify} = require('util');
const walker = promisify(require("../lib/custom-utils").walker);
const locales = ["en_US", "ru", "de"];
const defaultLocale = "en_US";
const tagSelector = /<([\w]+)([^>]*)>/g;
const allowedTags = ["a", "img", "p", "span", "div", "em", "i", "b", "strong"];

// Translation strings selector Regular expression
// {(\w[\w-]*)(\([^\)]*\))?(\[[^\]]*])?(\s(\\\}|[^\}])+)?} With escapes
// {(\w[\w-]*)(\([^\)]*\))?(\[[^\]]*])?(\s[^\}]+)?}  Fast without escape
const translationSelector =new RegExp([
    /{/                   // Match "{" character
  , /(\w[\w-]*)/          // Select StringId part of the string
  , /(\([^\)]*\))?/       // Select Optional Path part
  , /(\[[^\]]*])?/        // Select Optional description part
  , /(\s(\\\}|[^\}])+)?/  // Select Optional Message itself
  , /}/                   // Match "}" character
].map((exp) => exp.source).join(""), "g"); 

// ex.: {about.json: {en_US: {stringID: {message: {...}}}, {de: {...}}}
let i18nTree = {};

/**
 * Reads JSON file and assign filename and locale to it
 * @param  {String} file path to the file to read 
 * @return {Promise} Promise object
 */
let readTranslation = function(file)
{
  return new Promise((resolve, reject) =>
  {
    fs.readFile(file, "utf8", (err, data) =>
    {
      if (err)
      {
        reject(err);
      }
      else
      {
        let json = {};
        [json.locale, ...json.filename] = file.split("/").slice(3);
        json.filename = json.filename.join("/");
        json.strings = JSON.parse(data);
        resolve(json);
      }
    });
  }).catch(reason => // Continue Promise.All even if rejected.
  {
    // Commented out log not to spam the output.
    // TODO: Think about more meaningful output without spaming
    // console.log(`Reading ${path} was rejected: ${reason}`);
  });
};

/**
 * Generates Object tree from the translations files, for easier search
 * ex.: {about.json: {en_US: {stringID: {message: {...}}}, {de: {...}}}
 * @param  {Function} callBack 
 *                             Parameters:
 *                               * Error message
 *                               * Boolean, true if Tree is generated
 */
let init = function(callBack)
{
  walker("./src/locales").then((files) =>
  {
    let translationPromises = files.map((file) => readTranslation(file));
    Promise.all(translationPromises).then((files) =>
    {
      i18nTree = files.reduce((acc, fileObject) =>
      {
        if (!fileObject)
          return acc;

        let filename = fileObject.filename;
        let locale = fileObject.locale;
        if (!acc[filename])
          acc[filename] = {};

        acc[filename][locale] = fileObject.strings;
        return acc;
      }, {});
      callBack(null, true);
    });
  });
};

/**
 * Replace translation placeholders with actual translation strings
 * @param  {String} html   html string with translations strings
 * @param  {String} page   page with extension ex.: about/team.md
 * @param  {String} locale locale to transle to ex.: "de"
 * @return {String}        translated html file
 */
let translate = function(html, page, locale)
{
  let match;
  let cache = {};
  while ((match = translationSelector.exec(html)) != null)
  {
    let [placeholder, stringId, filePath, description, message] = match;
    if (description)
      description = description.substring(1, --description.length); // remove []

    if (message)
    {
      message = message.trim();
      if (locale != defaultLocale)
      {
        filePath = page.substr(0, page.lastIndexOf(".")) + ".json";
        let localMessage = getMessage(stringId, filePath, locale);
        if (localMessage)
          message = parseMessage(localMessage, generateTagsMap(message));
      }
    }
    else if (filePath) // Reference to separate translation file
    {
      filePath = filePath.substring(1, --filePath.length); // remove ()
      message = getMessage(stringId, filePath, defaultLocale);
      if (!message)
        message = placeholder;
      else if (locale != defaultLocale)
      {
        let localMessage = getMessage(stringId, filePath, locale);
        if (localMessage)
          message = parseMessage(localMessage);
      }
      else
      {
        message = parseMessage(message);
      }
    }
    else
    {
      if (cache[stringId] && cache[stringId].message)
        message = cache[stringId].message;
      else
        message = placeholder;
    }

    cache[stringId] = {message: message, description: description};
    html = cicleReplace(translationSelector, html, placeholder, message);
  }
  return html;
};

/**
 * Get message from the memory (i18nTree)
 * @param  {String} stringId      Message String ID
 * @param  {String} localePath    Path to the translation in locales directory
 *                                ex: about/team.json
 * @param  {String} locale        locale of the message ex.: "de"
 * @return {String}               The localized message or null if can't find
 */
function getMessage(stringId, localePath, locale)
{
  if (i18nTree[localePath] && i18nTree[localePath][locale] &&
    i18nTree[localePath][locale][stringId])
  {
    return i18nTree[localePath][locale][stringId].message;
  }
  return null;
}

/**
 * If tagsMap is set updates the localized String tags placeholders.
 * Localized string uses <tagName + number>...</tagname + number(optional)> 
 * syntax in order to update HTML tag arguments inside accordingly. 
 * The function is used for Sanitization.
 * @param  {String} text    Translation text
 * @param  {Object} tagsMap (optional) tagsMap generated from the default
 *                          language text.
 * @return {String}         text with updated HTML arguments
 */
function parseMessage(text, tagsMap)
{
  // Sanitize quotation marks.
  text = text.replace(/'/g, "&apos;");
  text = text.replace(/"/g, "&quot;");
  while ((match = tagSelector.exec(text)) != null)
  {
    let [tag, tagName, attributes] = match;
    let originalAttributes = "";
    let tagNumber = "";
    if (tagsMap)
    {
      tagNumber = /\d+$/.exec(tagName);
      tagNumber = tagNumber ? tagNumber[0] : "";
      tagName = tagName.replace(tagNumber, "");
    }

    // Remove attribute from the translation string tags
    if (attributes)
      text.replace(attributes, "");

    if (tagsMap && tagNumber)
      originalAttributes = tagsMap[tagName][tagNumber - 1];

    let openTag = "<";
    let closeTag = ">";

    // Sanitize not allowed tags
    if (!allowedTags.includes(tagName))
    {
      openTag = "&lt";
      closeTag = "&gt;"
    }

    text = cicleReplace(tagSelector, text, tag,
      `${openTag}${tagName}${originalAttributes}${closeTag}`);
    // Replace cose tags
    text = cicleReplace(tagSelector, text, `</${tagName + tagNumber}>`,
      `${openTag}/${tagName}${closeTag}`);
  }
  return text;
}

/**
 * Replaces the substring in the text with new one and update the lastIndex
 * accordingly, not to end up in the infinite loop during execution cicle
 * @param  {RegExp} regExp       Regular expression used for the search
 * @param  {String} text         Text used for the search
 * @param  {String} subString    subString to replace
 * @param  {String} newSubString subString to replace with
 * @return {String}              updated text
 */
function cicleReplace(regExp, text, subString, newSubString)
{
  text = text.replace(subString, newSubString);
  regExp.lastIndex = regExp.lastIndex + (newSubString.length - subString.length);
  return text;
}

/**
 * Generates tags map from original string HTML tag attributes.
 * @param  {String} text text with HTML tags, typically original string message
 * @return {Object}      Tags map object, example:
 *                            { img: [ ' src="myImage.jpg" class="blurred" /' ],
 *                            strong: [ '' ],
 *                            a: [ ' href="w3c.org"', ' href="example.org"' ] }
 */
function generateTagsMap(text)
{
  let tagsMap = {};
  while ((match = tagSelector.exec(text)) != null)
  {
    let [tag, tagName, attributes] = match;
    tagsMap[tagName] ? tagsMap[tagName].push(attributes) :
      tagsMap[tagName] = [attributes];
  }
  return tagsMap;
}

/**
 * Get requested locale from the URL parts Array ex.: [ 'ru', 'about' ]
 * @param  {String} url Request URL
 * @return {String}     Requested locale
 */
let getLocaleFromUrlParts = function(urlParts)
{
  return locales.includes(urlParts[0]) ? urlParts.shift() : defaultLocale;
};

exports.init = init;
exports.translate = translate;
exports.getLocaleFromUrlParts = getLocaleFromUrlParts;
