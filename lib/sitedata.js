"use strict";

const fs = require("fs");
const {promisify} = require("util");
const readFile = promisify(fs.readFile);
const frontMatter = require("front-matter");
const glob = promisify(require("glob").glob);
const {getOriginalPathname, getPathname} = require("./custom-utils");

const {pageDir} = require("../config").dirs;

let pageDatas = [];
let permalinktoPageMap = {};

let initSitedata = (callback) =>
{
  glob(`${pageDir}/**/`, {}).then((folders) =>
  {
    for (let folder of folders)
    {
      fs.watch(folder, {}, () =>
      {
        createSitedata(callback);
      });
    }
  });
  createSitedata(callback);
};

function createSitedata(callback)
{
  pageDatas = [];
  permalinktoPageMap = {};
  glob(`${pageDir}/**/*.*`, {}).then((filePaths) =>
  {
    let filesStack = filePaths.slice();
    for (const filePath of filePaths)
    {
      readFile(filePath, "utf8").then(frontMatter).then((data) =>
      {
        filesStack.pop();
        if (data.attributes.permalink)
        {
          // Add to permlinks
          const pathname = getOriginalPathname(filePath);
          permalinktoPageMap[data.attributes.permalink] = pathname;
        }

        data.attributes.pathname = getPathname(filePath, data.attributes);
        data.attributes.originalPathname = getOriginalPathname(filePath);
        pageDatas.push(data.attributes);

        if (filesStack.length === 0)
          callback(null, true);
      });
    }
  });
}

const getPermalinkedPage = function(path)
{
  return permalinktoPageMap[path];
};

const getPagePermalink = function(path)
{
  const originalPathname = getOriginalPathname(path);
  return Object.keys(permalinktoPageMap).find((key) =>
    permalinktoPageMap[key] === originalPathname);
};

const isPagePermalinked = function(path)
{
  return Object.values(permalinktoPageMap).includes(path);
};

const resolveOriginalPage = (path) => getPermalinkedPage(path) || path;

const queryPages = (filter) => pageDatas.filter(filter);

module.exports = {initSitedata, queryPages, getPermalinkedPage,
  isPagePermalinked, resolveOriginalPage, getPagePermalink};
