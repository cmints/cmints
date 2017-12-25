const fs = require("fs");
const {promisify} = require('util');
const walker = promisify(require("../lib/custom-utils").walker);
const locales = ["en", "ru", "de"];
const defaultLocale = "en";

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
      let messages;
      if (pageObj)
        messages = pageObj[locale];
      if (messages && messages[stringId])
      {
        translationSelector.lastIndex -= message.length;
        message = messages[stringId].message;
        translationSelector.lastIndex += message.length;
      }
    }
    translationSelector.lastIndex -= stringId.length + 3;
    html = html.replace(translation, message);
  }

  return html;
};

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
