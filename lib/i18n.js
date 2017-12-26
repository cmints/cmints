const fs = require("fs");
const {promisify} = require('util');
const walker = promisify(require("../lib/custom-utils").walker);
const locales = ["en", "ru", "de"];
const defaultLocale = "en";
const allowedTags = ["<strong>", "</strong>"];
const tagSelector = /<([\w]+)([^>]*)>/g;

let stringsTree = {};

/**
 * Reads JSON file and assign filename and locale to it
 * @param  {String} file path to the file to read 
 * @return {Promise} Promise object
 */
let readTranslation = function(file)
{
  //console.log(file);
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
      let dataTreeObj = files.reduce((acc, fileObject) =>
      {
        if (!fileObject)
          return acc;

        let filename = fileObject.filename;
        let locale = fileObject.locale;
        if (!acc[filename])
        {
          acc[filename] = {};
        }
        acc[filename][locale] = fileObject.strings;
        return acc;
      }, {});
      stringsTree = dataTreeObj;
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
  let translationSelector = /{(\w[\w-]*)(\[[^\]]*])?\s((\\\}|[^\}])+)}/g;
  // {(\w[\w-]*)(\[[^\]]*])?\s([^\}]+)  Fast without escape
  let match;
  let translatedHtml = html;

  while ((match = translationSelector.exec(html)) != null)
  {
    let [translation, stringId, description, message] = match;
    if (description)
    {
      description = description.substring(1, --description.length);
      translationSelector.lastIndex -= description.length;
    }

    if (locale != defaultLocale)
    {
      let jsonPage = page.substr(0, page.lastIndexOf(".")) + ".json";
      let pageObj = stringsTree[jsonPage];
      let tagsMap = generateTagsMap(message);
      let messages;
      if (pageObj)
        messages = pageObj[locale];
      if (messages && messages[stringId])
      {
        translationSelector.lastIndex -= message.length;
        message = messages[stringId].message;
        message = updateTranslationTags(message, tagsMap);
        translationSelector.lastIndex += message.length;
      }
    }
    translationSelector.lastIndex -= stringId.length + 3;
    html = html.replace(translation, message);
  }

  return html;
};

function updateTranslationTags(text, tagsMap)  //TODO: Refactor and add comments
{
  while ((match = tagSelector.exec(text)) != null)
  {
    let [tag, tagNameNumber, attributes] = match;
    let tagNumber = /\d+$/.exec(tagNameNumber);
    let tagName = tagNameNumber;
    if (tagNumber)
    {
      tagNumber = tagNumber[0];
      tagName = tagNameNumber.replace(tagNumber, "");
    }

    let originalAttributes = "";

    if (attributes)
      text.replace(attributes, "");
    
    if (tagNumber)
    {
      originalAttributes = tagsMap[tagName][tagNumber - 1];
    }
    let finalTag = `<${tagName}${originalAttributes}>`;
    text = text.replace(tag, finalTag);
    let endTagOld = `</${tagNameNumber}>`;
    let endTagNew = `</${tagName}>`;
    text = text.replace(endTagOld, endTagNew);
    console.log(tagSelector.lastIndex);
    tagSelector.lastIndex = tagSelector.lastIndex + (endTagNew.length - endTagOld.length); //TODO: Use separate function
    tagSelector.lastIndex = tagSelector.lastIndex + (finalTag.length - tag.length);
    console.log(tagSelector.lastIndex);
  }
  return text;
}

function generateTagsMap(text)  //TODO: Refactor and add comments
{
  let tagsMap = {};
  while ((match = tagSelector.exec(text)) != null)
  {
    let count = 1;
    let [tag, tagName, attributes] = match;
    let isCloseTag = tagName.startsWith("/");
    tagName = tagName.replace("/", "");
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
exports.stringsTree = stringsTree;
exports.locales = locales;
exports.defaultLocale = defaultLocale;
exports.getLocaleFromUrlParts = getLocaleFromUrlParts;
