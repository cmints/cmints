const fs = require("fs");
const {promisify} = require('util');
const walker = promisify(require("../lib/custom-utils").walker);
const {parseAttributes, getDeepValue} = require("../lib/custom-utils");
const locales = ["en", "ru", "de"];
const defaultLocale = "en";
const tagSelector = /<([\w]+)([^>]*)>/g;
const allowedTags = ["a", "img", "p", "span", "div", "em", "i", "b", "strong"];
const allowedAttributes = ["title", "alt"];

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

// ex.: {about.json: {en: {stringID: {message: {...}}}, {de: {...}}}
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
 * ex.: {about.json: {en: {stringID: {message: {...}}}, {de: {...}}}
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
        {
          localMessage = parseFixTags(message, localMessage);
          message = parseMessage(localMessage, locale, message);
        }
      }
      else
      {
        message = parseFixTags(message);
      }
    }
    else if (filePath) // Reference to separate translation file
    {
      filePath = filePath.substring(1, --filePath.length); // remove ()
      message = getMessage(stringId, filePath, locale);
      if (!message)
        message = placeholder;
      else
        message = escapeTags(escapeQuotes(message));
    }
    else
    {
      if (cache[stringId] && cache[stringId].message)
        message = cache[stringId].message;
      else
        message = placeholder; // If couldn't find
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
 * @param  {String} text          Translation text
 * @param  {String} locale        Locale for internal link generation
 * @param  {String} sourceMessage original message
 * @return {String}               text with updated HTML arguments
 */
function parseMessage(text, locale, sourceMessage)
{
  let sourceTagsMap = createTagsMap(sourceMessage);
  let localeTagsMap = createTagsMap(text);
  // Sanitize quotation marks.
  text = escapeQuotes(text);
  let match;
  while ((match = tagSelector.exec(text)) != null)
  {
    let [tag, tagName, attributes] = match;
    let tagNumber = /\d+$/.exec(tagName);
    tagNumber = tagNumber ? tagNumber[0] : "";
    tagName = tagName.replace(tagNumber, "");
    let sourceAttributes = getDeepValue([tagName, tagNumber - 1], sourceTagsMap);

    // Remove attribute from the translation string tags
    if (attributes)
      text.replace(attributes, "");

    attributes = []; // Reset attributes
    // Find attributes for tag placeholder
    if (sourceAttributes)
    {
      let localeTagName = tagName + tagNumber;
      let attributesObj = getDeepValue([localeTagName, 0], localeTagsMap);
      sourceAttributes = Object.entries(sourceAttributes);
      let hasRelativeLink = false;
      for (let [attr, value] of sourceAttributes)
      {
        // Default locale as a fallback
        if (attr == "href" && tagName == "a" && value.startsWith("/"))
        {
          hasRelativeLink = true;
          value = value.split("/");
          value.shift();
          if (value.length > 0 && locales.includes(value[0]))
            value.shift();

          value = value.join("/");
          let linkLocale = isTranslated(value, locale) ? locale : defaultLocale;
          value = `/${linkLocale}/${value}`;

          attributes.push(value ? `${attr}="${escapeQuotes(value)}"` : attr);
          // Add hreflang attribute to improve Accesibility
          attributes.push(`hreflang="${linkLocale}"`);
        }
        else if (attr == "hreflang" && hasRelativeLink)
        {
          continue;
        }
        else
        {
          // Use allowed attribute from translation text
          let allowedTagIndex = allowedAttributes.indexOf(attr);
          let attribute = allowedAttributes[allowedTagIndex];
          if (allowedTagIndex >= 0 && getDeepValue([attribute], attributesObj))
            value = attributesObj[allowedAttributes[allowedTagIndex]];

          attributes.push(value ? `${attr}="${escapeQuotes(value)}"` : attr);
        }
      }
    }

    let openTag = "<";
    let closeTag = ">";
    // Sanitize not allowed tags
    if (!allowedTags.includes(tagName))
    {
      openTag = "&lt";
      closeTag = "&gt;";
    }

    attributes = attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
    text = cicleReplace(tagSelector, text, tag,
      `${openTag}${tagName}${attributes}${closeTag}`);
    // Replace close tags
    text = cicleReplace(tagSelector, text, `</${tagName + tagNumber}>`,
      `${openTag}/${tagName}${closeTag}`);
  }
  return text;
}

/**
 * Use <fix> from the original string to update <fix + number> in local message
 * @param  {String} sourceMessage   Source message
 * @param  {String} localMessage    Local message
 * @return {String}                 Source message without <fix> tags or local
 *                                  message with replaced <fix + number>
 */
function parseFixTags(sourceMessage, localMessage)
{
  const fixRegExt = /<fix>(.+?)<\/fix>/g;
  let match;
  let fixes = [];
  while ((match = fixRegExt.exec(sourceMessage)) != null)
  {
    let [fixMatch, fixValue] = match;
    fixes.push(fixValue);
    sourceMessage = cicleReplace(fixRegExt, sourceMessage, fixMatch, fixValue);
  }
  if (!localMessage)
    return sourceMessage;

  const fixNumRegExt = /<fix(\d+)>/g;
  while ((match = fixNumRegExt.exec(localMessage)) != null)
  {
    let [fixMatch, fixNumber] = match;
    let fix = fixes[fixNumber -1] ? fixes[fixNumber -1] : escapeTags(fixMatch);
    localMessage = cicleReplace(fixNumRegExt, localMessage, fixMatch, fix);
  }
  return localMessage;
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
 *                            { strong: [ {} ],
 *                            a: [{ href: '"/about"', class: '"highlighted"' },
 *                                { href: '"http://w3c.org"', required: '' }] }
 */
function createTagsMap(text)
{
  let tagsMap = {};
  while ((match = tagSelector.exec(text)) != null)
  {
    let [tag, tagName, attributes] = match;
    // Create attributes Map ex.: { href: '"/about"', class: '"highlighted"' }
    let attributesMap = parseAttributes(attributes);

    tagsMap[tagName] ? tagsMap[tagName].push(attributesMap) :
      tagsMap[tagName] = [attributesMap];
  }
  return tagsMap;
}

/**
 * Escapes quotation marks in the string
 */
function escapeQuotes(text)
{
  return text.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

/**
 * Escapes tag characters in the string
 */
function escapeTags(text)
{
  return text.replace(/</g, "&lt").replace(/>/g, "&gt;");
}

/**
 * Check if the page is translated
 * @param  {Strong}  page   path of the page ex.: about/team
 * @param  {String}  locale current locale
 * @return {Boolean}
 */
function isTranslated(page, locale)
{
  let pageTranslations = i18nTree[page + ".json"];
  return pageTranslations && pageTranslations[locale];
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
