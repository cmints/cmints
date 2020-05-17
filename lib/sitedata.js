"use strict";

const fs = require("fs");
const {promisify} = require("util");
const readFile = promisify(fs.readFile);
const frontMatter = require("front-matter");
const {originalPathnameFromFile, pagePathFromFile,
  getPathname, glob} = require("./custom-utils");

const {pageDir} = require("../config").dirs;

let pageDatas = [];
let permalinktoPageMap = {};
let creatingSiteData = false;

let initSitedata = (callback) =>
{
  glob(`${pageDir}/**/`, {}).then((folders) =>
  {
    for (let folder of folders)
    {
      fs.watch(folder, {}, () =>
      {
        if (!creatingSiteData)
          createSitedata(callback);
      });
    }
  });
  createSitedata(callback);
};

function createSitedata(callback)
{
  creatingSiteData = true;
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
          const pathname = pagePathFromFile(filePath);
          permalinktoPageMap[data.attributes.permalink] = pathname;
        }

        data.attributes.pathname = getPathname(filePath, data.attributes);
        data.attributes.originalPathname = originalPathnameFromFile(filePath);
        pageDatas.push(data.attributes);

        if (filesStack.length === 0)
        {
          callback(null, true);
          creatingSiteData = false;
        }
      });
    }
  });
}

const getPermalinkedPage = function(pathname)
{
  return permalinktoPageMap[pathname];
};

const getPagePermalink = function(path)
{
  const pagePath = pagePathFromFile(path);
  return Object.keys(permalinktoPageMap).find((key) =>
    permalinktoPageMap[key] === pagePath);
};

const isPagePermalinked = function(path)
{
  return Object.values(permalinktoPageMap).includes(path);
};

const resolveOriginalPage = (pathname) => getPermalinkedPage(pathname) ||
                                          pathname;

const queryPages = (filter) => pageDatas.filter(filter);

module.exports = {initSitedata, queryPages, getPermalinkedPage,
  isPagePermalinked, resolveOriginalPage, getPagePermalink};
