"use strict";

const {promisify} = require("util");
const glob = promisify(require("glob").glob);
const fs = require("fs");
const path = require("path");
const browserify = require("browserify");
const ensureDir = require("fs-extra").ensureDirSync;
const {browserifyDir} = require("../config").dirs;

let inputDir = "";
let outputDir = "";
let browserifyOptions = {};

/**
 * Initializes the module
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location
 * @param  {String} options          Browserify options object
 * @param  {Function} callBack
 *                                  Parameters:
 *                                    * Error message
 *                                    * Boolean, true if Processed successfully
 */
const initBrowserify = function(inputDirPath, outputDirPath, options, callback)
{
  inputDir = inputDirPath;
  outputDir = outputDirPath;
  browserifyOptions = options;
  glob(`${inputDirPath}/**/`, {}).then((folders) =>
  {
    prepareBrowserify(callback);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, () =>
      {
        prepareBrowserify();
      });
    }
  });
};

/**
 * Pre bundler
 */
function prepareBrowserify(callback)
{
  glob(`${inputDir}/**/[!_]*.js`, {}).then((files) =>
  {
    if (files.length == 0 && callback)
      callback(null, true);

    const filesStack = files;
    for (let file of files)
    {
      let {dir, base} = path.parse(file);
      dir = path.relative(browserifyDir, dir);
      dir = path.join(outputDir, dir);
      if (!fs.existsSync(dir))
        ensureDir(dir);

      const outputTarget = path.join(dir, base);
      bundleBrowserify(file, outputTarget, filesStack, callback);
    }
  });
}

/**
 * Bundling files using Browserify
 * @param {String} inputFilePath  Path to the source file
 * @param {String} outputFilePath Output target path
 * @param {Function} callback
 */
function bundleBrowserify(inputFilePath, outputFilePath, filesStack, callback)
{
  const bundleFs = fs.createWriteStream(outputFilePath);
  const b = browserify();
  b.add(inputFilePath, browserifyOptions);
  bundleFs.on("finish", () =>
  {
    console.log(`${outputFilePath} is processed`);

    filesStack.pop();
    // Check if all files are processed
    if (!filesStack.length && callback)
      callback(null, true);
  });
  b.bundle().pipe(bundleFs);
}

module.exports = {initBrowserify};
