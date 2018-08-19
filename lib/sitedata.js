const fs = require("fs");
const {promisify} = require("util");
const readFile = promisify(fs.readFile);
const frontMatter = require("front-matter");
const glob = promisify(require("glob").glob);
const {pathnameFromfilePath} = require("./custom-utils");

const {pageDir} = require("../config").dirs;

const pageDatas = [];

let initSitedata = (callback) =>
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
        const pathname = pathnameFromfilePath(filePath, pageDir);
        data.attributes.pathname = pathname;
        pageDatas.push(data.attributes);

        if (filesStack.length === 0)
          callback(null, true);
      });
    }
  });
}

const queryPages = (filter) => pageDatas.filter(filter);

module.exports = {initSitedata, queryPages};
