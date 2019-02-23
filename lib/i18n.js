"use strict";

const fs = require("fs");
const {promisify} = require("util");
const path = require("path");
const parseUrl = require("url").parse;
const glob = promisify(require("glob").glob);
const acceptLanguage = require("accept-language");
const {parseAttributes, getDeepValue} = require("../lib/custom-utils");
const {resolveOriginalPage} = require("./sitedata");
const tagSelector = /<([\w]+)([^>]*)>/g;
const fixSelector = /<fix>(.+?)<\/fix>/g;
const allowedTags = ["a", "img", "p", "span", "div", "em", "i", "b", "strong",
                     "code"];
const allowedAttributes = ["title", "alt"];
let localesDir = "";
let locales = [];
let root = "";
let type = "Index";

// Translation strings selector Regular expression
// {(\w[\w-]*)(\([^\)]*\))?(\[[^\]]*])?(\s(\\}|[^}])+)?} With escapes
let prefix = "{";
let postfix = "}";
let defaultLocale = "en";
const i18nStringPartSelectors =
[
  "(\\w[\\w-]*)"                            // Select StringId
  , "(\\([^\\)]*\\))?"                      // Select Optional Path
  , "(\\[[^\\]]*])?"                        // Select Optional description
  , `(\\s(\\\\${postfix}|[^${postfix}])+)?` // Select Optional Message
];
let i18nSelector = null;

// ex.: {about: {en: {stringID: {message: {...}}}, {de: {...}}}
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
        file = path.relative(localesDir, file);
        [json.locale, ...json.filename] = file.split(path.sep);
        json.filename = json.filename.join("/").replace(".json", "");
        json.strings = JSON.parse(data);
        resolve(json);
      }
    });
  }).catch(() => // Continue Promise.All even if rejected.
  {
    // Commented out log not to spam the output.
    // console.log(`Reading ${path} was rejected: ${reason}`);
  });
};

/**
 * Initialize the i18n module and watch directories
 * @param  {String} localesDir    Location of the directory with the locales
 * @param  {Array} watchDirs      Additional directories to watch for changes
 *                                to regenerate i18nTree accordingly
 * @param  {Object} options       properties:
 *                                  * defaultLocale - Default locale directory
 *                                    name by default "en"
 *                                  * prefix - prefix to assign to the i18n
 *                                    selector by deafult "{"
 *                                  * postfix - postfix to assign to the i18n
 *                                    selector by deafult "}"
 * @param  {Function} callBack
 *                                Parameters:
 *                                  * Error message
 *                                  * Boolean, true if Tree is generated
 */
let init = function(localesDirPath, watchDirs, options, callBack)
{
  if (!options)
  {
    const errorMsg = "No options are defined for i18n";
    console.error(errorMsg);
    if (callBack)
      callBack(errorMsg, false);
    return;
  }
  if ("prefix" in options)
    ({prefix} = options);
  if ("postfix" in options)
    ({postfix} = options);
  if ("defaultLocale" in options)
    ({defaultLocale} = options);
  if ("root" in options)
    ({root} = options);
  if ("type" in options)
    ({type} = options);

  const selector = i18nStringPartSelectors.join("");
  i18nSelector = new RegExp((prefix + selector + postfix), "g");

  localesDir = localesDirPath;
  if (!watchDirs)
    watchDirs = [];

  watchDirs.push(localesDir);
  glob(`${localesDir}/*`, {}).then((dirs) =>
  {
    // Extract locales from the directory names
    locales = dirs.map((dir) => path.parse(dir).name);
    return glob(`{${watchDirs.join("/**/,")}/**/}`, {});
  }).then((folders) =>
  {
    generateTree(callBack);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, () =>
      {
        generateTree();
      });
    }
  });
};

/**
 * Generates Object tree from the translations files, for easier search
 * ex.: {about: {en: {stringID: {message: {...}}}, {de: {...}}}
 * @param  {Function} callBack
 *                             Parameters:
 *                               * Error message
 *                               * Boolean, true if Tree is generated
 */
let generateTree = function(callBack)
{
  i18nTree = {}; // Reset the tree
  glob(`${localesDir}/**/*.json`).then((files) =>
  {
    let translationPromises = files.map((file) => readTranslation(file));
    Promise.all(translationPromises).then((files) =>
    {
      i18nTree = files.reduce((acc, fileObject) =>
      {
        if (!fileObject || !Object.keys(fileObject.strings).length)
          return acc;

        let {filename} = fileObject;
        let {locale} = fileObject;
        if (!acc[filename])
          acc[filename] = {};

        acc[filename][locale] = fileObject.strings;
        return acc;
      }, {});
      if (callBack)
        callBack(null, true);
    });
  });
};

/**
 * Replace translation placeholders with actual translation strings
 * @param  {String} html       html string with translations strings
 * @param  {String} pagePath   pagePath path ex.: about/team (without extension)
 * @param  {String} locale     locale to transle to ex.: "de"
 * @return {String}            translated html file
 */
let translate = function(html, pagePath, locale)
{
  let match;
  let cache = {};
  html = setAnchorHrefAndHreflang(html, locale);
  while ((match = i18nSelector.exec(html)) != null)
  {
    let [placeholder, stringId, localePath, description, message] = match;
    if (description)
    {
      // remove []
      description = description.substring(1, description.length - 1);
    }

    if (message)
    {
      message = message.trim();
      if (locale != defaultLocale)
      {
        let localMessage = getMessage(stringId, pagePath, locale);
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
    else if (localePath) // Reference to separate translation file
    {
      localePath = localePath.substring(1, localePath.length - 1); // remove ()
      message = getMessage(stringId, localePath, locale);
      if (!message && locale != defaultLocale)
      {
        let originalMessage = getMessage(stringId, localePath, defaultLocale);
        message = originalMessage ? originalMessage : placeholder;
      }
      else if (!message)
      {
        message = placeholder;
      }
      else
        message = escapeTags(escapeQuotes(message));
    }
    else if (cache[stringId] && cache[stringId].message)
    {
      ({message} = cache[stringId]);
    }
    else
    {
      message = placeholder; // If couldn't find
    }

    cache[stringId] = {message, description};
    html = cicleReplace(i18nSelector, html, placeholder, message);
  }
  return html;
};

/**
 * Updates relative Anchor tags with the locale path and set hreflang
 * accordingly
 * @param {String} html containing <a> tags
 * @param {String} locale Locale for negotiation
 * @returns {String}
 */
function setAnchorHrefAndHreflang(html, locale)
{
  const hrefSelector = new RegExp("<a+([^>]*)>", "g");
  let match;
  while ((match = hrefSelector.exec(html)) != null)
  {
    const [/* fullMatch */, attributes] = match;
    if (!attributes)
      continue;

    const attributesMap = parseAttributes(attributes);
    const {href} = attributesMap;
    if (!href || !href.startsWith("/"))
      continue;

    const [newHref, newHrefLang] = hrefAndLang(href, locale);
    attributesMap.href = newHref;
    attributesMap.hreflang = newHrefLang;
    const keys = ["href", "hreflang"];
    keys.push(...Object.keys(attributesMap).filter((item) =>
      !keys.includes(item)));
    const newAttributes = " " + keys.map((key) =>
    {
      if (attributesMap[key])
        return `${key}="${escapeQuotes(attributesMap[key])}"`;
      else
        key;
    }).join(" ");
    html = cicleReplace(hrefSelector, html, attributes, newAttributes);
  }

  return html;
}

/**
 * Generates JSON object using the translation strings
 * Used for the source JSON files generation for the crowdin API
 * @param {String} html document containing translation string
 */
const generateSourceJson = function(html)
{
  let match;
  let result = {};
  while ((match = i18nSelector.exec(html)) != null)
  {
    let [/* placeholder */, stringId, /* localePath */, description,
      message] = match;

    if (!message)
      continue;

    if (description)
    {
      // remove []
      description = description.substring(1, description.length - 1);
    }
    else
      description = "";

    description += "\n";
    description += updateDescriptionTags(message);
    message = message.trim();
    result[stringId] = {message, description};
  }
  return result;
};

function updateDescriptionTags(message)
{
  const tagsMap = {};
  ["fix", "a", "span"].forEach((tag) =>
  {
    const fullTagsSelector = new RegExp(`<((${tag}).*?)>([\\S\\s]*?)<\/(${tag})>`,
                                        "g");
    let match;
    while ((match = fullTagsSelector.exec(message)) != null)
    {
      let [/* fullMatch */, fullTag, tagName, content] = match;
      if (tagsMap[tagName])
        tagsMap[tagName].push({fullTag, content});
      else
        tagsMap[tagName] = [{fullTag, content}];
    }
  });

  const removeNewLine = (text) => text.replace(/\r?\n|\r/g, " ");
  let description = "";
  for (const tagName in tagsMap)
  {
    description += `<${tagName}> placeholders:\n`;
    for (let i = 0; i < tagsMap[tagName].length; i++)
    {
      const fullTag = removeNewLine(tagsMap[tagName][i].fullTag);
      const content = removeNewLine(tagsMap[tagName][i].content);
      const tagCount = `<${tagName}${i + 1}>`;
      const tagCountClose = `</${tagName}${i + 1}>`;
      if (tagName === "fix")
      {
        description += `${tagCount} - ${content}`;
      }
      else
      {
        description += `${tagCount}${content}${tagCountClose} - <${fullTag}>${content}</${tagName}>`;
      }
      description += "\n";
    }
  }
  return description;
}

/**
 * Get message from the memory (i18nTree)
 * @param  {String} stringId      Message String ID
 * @param  {String} localePath    Path to the translation in locales directory
 *                                ex: about/team
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
    let sourceAttributes = getDeepValue([tagName, tagNumber - 1],
                                        sourceTagsMap);

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
      for (let [attr, value] of sourceAttributes)
      {
        // Use allowed attribute from translation text
        let allowedTagIndex = allowedAttributes.indexOf(attr);
        let attribute = allowedAttributes[allowedTagIndex];
        if (allowedTagIndex >= 0 && getDeepValue([attribute], attributesObj))
          value = attributesObj[allowedAttributes[allowedTagIndex]];

        attributes.push(value ? `${attr}="${escapeQuotes(value)}"` : attr);
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
 * Creates href and lang attributes depending on page language availability
 * @param  {String} url      URL of the page
 * @param  {String} locale   Locale for checking the availability
 * @return {Array}           ex.: [ 'href="/ru/about/team"', 'hreflang="ru"' ]
 */
function hrefAndLang(url, locale)
{
  if (url.startsWith("http://") || url.startsWith("https://"))
    return [`href=${url}`];

  if (url.startsWith("/"))
  {
    url = url.split("/");
    url.shift();
    if (url.length > 0 && locales.includes(url[0]))
    {
      [locale] = url;
      url.shift();
    }

    url = url.join("/");
  }

  let attributes = [];
  // Consider index as well (See #47)
  const {pathname} = parseUrl(url);
  const pagePath = pathname ? pathname : url;
  const isPageTransled = isTranslated(pagePath, locale) ||
                         isTranslated(path.join(pagePath, "index"), locale);

  let linkLocale = isPageTransled ? locale : defaultLocale;
  let pathLocale = linkLocale;
  if (linkLocale == defaultLocale && type == "Index")
    pathLocale = "";

  url = path.join("/", root, pathLocale, url);

  attributes.push(url);
  // Add hreflang attribute to improve Accesibility
  attributes.push(linkLocale);

  return attributes;
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
  let match;
  let fixes = [];
  while ((match = fixSelector.exec(sourceMessage)) != null)
  {
    let [fixMatch, fixValue] = match;
    fixes.push(fixValue);
    sourceMessage = cicleReplace(fixSelector, sourceMessage, fixMatch,
                                 fixValue);
  }
  if (!localMessage)
    return sourceMessage;

  const fixNumRegExt = /<fix(\d+)>/g;
  while ((match = fixNumRegExt.exec(localMessage)) != null)
  {
    let [fixMatch, fixNumber] = match;
    let fix = fixes[fixNumber - 1] ? fixes[fixNumber - 1] :
      escapeTags(fixMatch);
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
  const subStringLengthDiff = newSubString.length - subString.length;
  regExp.lastIndex += subStringLengthDiff;
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
  let match;
  while ((match = tagSelector.exec(text)) != null)
  {
    let [/* tag */, tagName, attributes] = match;
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
  page = resolveOriginalPage(page);
  let pageTranslations = i18nTree[page];
  return pageTranslations && pageTranslations[locale];
}

/**
 * Get available locales for the page
 * @param  {String}  pagePath   path of the page ex.: about/team
 * @return {Array}
 */
function getPageLocales(pagePath)
{
  pagePath = resolveOriginalPage(pagePath);
  let pageLocales = i18nTree[pagePath] ? Object.keys(i18nTree[pagePath]) : [];
  if (!pageLocales.includes(defaultLocale))
    pageLocales.push(defaultLocale);
  return pageLocales;
}

/**
 * Get requested locale from the URL parts Array ex.: [ 'ru', 'about' ]
 * @param  {String} url Request URL
 * @return {String}     Requested locale
 */
let getLocaleFromPath = function(url)
{
  let locale = url.split(path.sep).slice(1).shift();
  return locales.includes(locale) ? locale : null;
};

/**
 * Get stringID from the text containing translation string
 * @param  {String} text
 * @return {String}
 */
const getStringId = (text) =>
{
  const result = i18nSelector.exec(text);
  // Reset capture position
  i18nSelector.lastIndex = 0;
  return result ? result[1] : null;
};

/**
 *
 * @param {Array} locales list of BCP47 locales with leading default locale.
 * @param {String} acceptLanguageHeader accept-language header
 */
const getLocaleFromHeader = (locales, acceptLanguageHeader) =>
{
  acceptLanguage.languages(locales);
  return acceptLanguage.get(acceptLanguageHeader);
};

module.exports = {init, translate, getLocaleFromPath, getPageLocales,
  getStringId, defaultLocale, generateSourceJson,
  updateDescriptionTags, isTranslated, getLocaleFromHeader};
