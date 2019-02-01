"use strict";

const {promisify} = require("util");
const glob = promisify(require("glob").glob);
const fs = require("fs");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const path = require("path");
const browserify = require("browserify");
const ensureDir = require("fs-extra").ensureDirSync;
const {browserifyDir} = require("../config").dirs;
const UglifyJS = require("uglify-es");

let inputDir = "";
let outputDir = "";
let jsModuleOptions = {};
let minifyOptions = {};

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
  [jsModuleOptions, minifyOptions] = extractOptions(options);

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
 * Extract minification options from the browserify options
 * @param {Object} options Browserify and minification options
 * @returns {Array} 1-st item is the Browserify's options 2-nd uglify's
 */
function extractOptions(options)
{
  if (options.minify === true)
    options.minify = {};
  const minify = options.minify ? options.minify : null;
  delete options.minify;
  return [options, minify];
}

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
  b.add(inputFilePath, jsModuleOptions);
  bundleFs.on("finish", () =>
  {
    minification(outputFilePath).then(() =>
    {
      console.log(`${outputFilePath} is processed`);
      filesStack.pop();
      // Check if all files are processed
      if (!filesStack.length && callback)
        callback(null, true);
    });
  });
  b.bundle().pipe(bundleFs);
}

/**
 * Minifies the file
 * @param {String} filePath path to the file to be minified
 * @returns {Promise}
 */
function minification(filePath)
{
  if (!minifyOptions)
    return Promise.resolve("No minification set");


  return readFile(filePath, "utf8").then((data) =>
  {
    const uglifiedData = UglifyJS.minify(data, minifyOptions);
    return writeFile(filePath, uglifiedData.code);
  });
}

module.exports = {initBrowserify};
