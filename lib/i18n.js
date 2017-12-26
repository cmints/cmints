const fs = require("fs");
const {promisify} = require('util');
const walker = promisify(require("../lib/custom-utils").walker);
const locales = ["en", "ru", "de"];
const defaultLocale = "en";
const tagSelector = /<([\w]+)([^>]*)>/g;

// Translation strings selector Regular expression
// /{(\w[\w-]*)(\[[^\]]*])?\s((\\\}|[^\}])+)}/g; With escapes
// {(\w[\w-]*)(\[[^\]]*])?\s([^\}]+)  Fast without escape
const translationSelector =new RegExp([
    /{/                   // "{" character
  , /(\w[\w-]*)/          // StringId part of the string
  , /(\[[^\]]*])?/        // Optional description part
  , /\s((\\\}|[^\}])+)/   // Message itself
  , /}/                   // "}" character
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
    fs.readFile(file, "utf8", (err, data) => { 
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
  walker("./src/locales").then((files)=>
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
 * Replace translation strings with translations
 * @param  {String} html   html string with translations strings
 * @param  {String} page   page with extension ex.: about/team.md
 * @param  {String} locale locale to transle to ex.: "de"
 * @return {String}        translated html file
 */
let translate = function(html, page, locale)
{
  let match;
  while ((match = translationSelector.exec(html)) != null)
  {
    let [translation, stringId, description, message] = match;
    if (description)
    {
      translationSelector.lastIndex -= description.length; // minus [...]
      description = description.substring(1, --description.length);
    }

    if (locale != defaultLocale)
    {
      let jsonPage = page.substr(0, page.lastIndexOf(".")) + ".json";
      let tagsMap = generateTagsMap(message);
      let messages;
      if (i18nTree[jsonPage])
        messages = i18nTree[jsonPage][locale];

      if (messages && messages[stringId])
      {
        translationSelector.lastIndex -= message.length; // Default msg length
        message = messages[stringId].message;
        message = updateTranslationTags(message, tagsMap);
        translationSelector.lastIndex += message.length; // Localized msg length
      }
    }
    translationSelector.lastIndex -= stringId.length + 3; // Space and "{", "}"
    html = html.replace(translation, message);
  }
  return html;
};

/**
 * Use default language message html tag arguments to update the localized one.
 * Localized string uses <tagName + number>...</tagname + number(optional)> 
 * syntax in order to update HTML tag arguments, otherwise the arguments will be 
 * removed for security reasons (we don't want 3-rd party translators to do XSS
 * attacks).
 * @param  {String} text    Translation text
 * @param  {Object} tagsMap tagsMap generated from the default language text
 * @return {String}         text with updated HTML arguments
 */
function updateTranslationTags(text, tagsMap)
{
  while ((match = tagSelector.exec(text)) != null)
  {
    let [tag, tagName, attributes] = match;
    let originalAttributes = "";
    let tagNumber = /\d+$/.exec(tagName);
    tagNumber = tagNumber ? tagNumber[0] : "";
    tagName = tagName.replace(tagNumber, "");

    // Remove attribute from the translation string tags
    if (attributes)
      text.replace(attributes, "");

    if (tagNumber)
      originalAttributes = tagsMap[tagName][tagNumber - 1];

    text = cicleReplace(tagSelector, text, tag,
      `<${tagName}${originalAttributes}>`);
    text = cicleReplace(tagSelector, text, `</${tagName + tagNumber}>`,
      `</${tagName}>`);
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
