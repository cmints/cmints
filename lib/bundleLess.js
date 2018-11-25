"use strict";

const {promisify} = require("util");
const glob = promisify(require("glob").glob);
const fs = require("fs");
const path = require("path");
const ensureDir = require("fs-extra").ensureDirSync;
const {lessDir} = require("../config").dirs;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const less = require("less");

/**
 * Initializes the module
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location
 * @param  {Function} callBack
 *                                  Parameters:
 *                                    * Error message
 *                                    * Boolean, true if Processed successfully
 */
let initLess = function(inputDirPath, outputDirPath, callback)
{
  glob(`${inputDirPath}/**/`, {}).then((folders) =>
  {
    prepareLess(folders, inputDirPath, outputDirPath, callback);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, () =>
      {
        prepareLess(folders, inputDirPath, outputDirPath);
      });
    }
  });
};

/**
 * Bundle javascript files using Browserify
 * @param  {Array} folders Folders containing .js files
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location
 * @param  {Function} callBack
 *                                Parameters:
 *                                  * Error message
 *                                  * Boolean, true if Processed successfully
 */
function prepareLess(folders, inputDirPath, outputDirPath, callback)
{
  glob(`${inputDirPath}/**/[!_]*.less`, {}).then((files) =>
  {
    if (files.length == 0 && callback)
      callback(null, true);

    const filesStack = files;
    for (let file of files)
    {
      let {dir, base} = path.parse(file);
      base = base.replace(".less", ".css");
      dir = path.relative(lessDir, dir);
      dir = path.join(outputDirPath, dir);
      if (!fs.existsSync(dir))
        ensureDir(dir);

      const outputTarget = path.join(dir, base);
      bundleLess(file, outputTarget, folders, filesStack, callback);
    }
  });
}

/**
 * Bundles and output CSS using LESS
 * @param {String} inputFilePath  Path to the source file
 * @param {String} outputFilePath Output target path
 * @param {Function} callback
 */
function bundleLess(inputFilePath, outputFilePath, folders, filesStack,
                    callback)
{
  let options = {};
  options = Object.assign(options, {sourceMap: {sourceMapFileInline: true}});
  options = Object.assign(options, {paths: folders});
  readFile(inputFilePath, "utf-8").then((data) =>
  {
    return less.render(data.toString(), options);
  }).then((output) =>
  {
    return writeFile(outputFilePath, output.css, "utf8");
  }).then(() =>
  {
    console.log(`${outputFilePath} has been processed`);

    filesStack.pop();
    // Check if all files are processed
    if (!filesStack.length && callback)
      callback(null, true);
  }).catch((err) =>
  {
    console.error(`Error occured in ${inputFilePath}`);
    console.error(err);
  });
}

module.exports = {initLess};
