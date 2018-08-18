const fs = require("fs");
const path = require("path");
const {promisify} = require("util");
const readFile = promisify(fs.readFile);
const frontMatter = require("front-matter");
const glob = promisify(require("glob").glob);

const {pageDir} = require("../config").dirs;

let permalinktoPageMap = {};

let initPermalink = (callback) =>
{
  glob(`${pageDir}/**/`, {}).then((folders) =>
  {
    for (let folder of folders)
    {
      fs.watch(folder, {}, () =>
      {
        createPermalinks(callback);
      });
    }
  });
  createPermalinks(callback);
};

function createPermalinks(callback)
{
  permalinks = {};
  glob(`${pageDir}/**/*.*`, {}).then((filePaths) =>
  {
    let filesStack = filePaths.slice();
    for (const filePath of filePaths)
    {
      readFile(filePath, "utf8").then(frontMatter).then((data) =>
      {
        filesStack.pop();
        let {dir, name} = path.parse(filePath.replace(`${pageDir}/`, ""));
        let pageRequest = dir
        if (name != "index")
          pageRequest = path.join(pageRequest, name);
        if ("permalink" in data.attributes)
          permalinktoPageMap[data.attributes.permalink] = pageRequest;
          
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

const isPagePermalinked = function(path)
{
  return Object.values(permalinktoPageMap).includes(path);
};

module.exports = {initPermalink, getPermalinkedPage, isPagePermalinked};
