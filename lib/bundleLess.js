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
const cleanCss = require("less-plugin-clean-css");

let inputDir = "";
let outputDir = "";
let lessOptions = {};

/**
 * Initializes the module
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location
 * @param  {Function} callBack
 *                                  Parameters:
 *                                    * Error message
 *                                    * Boolean, true if Processed successfully
 */
let initLess = function(inputDirPath, outputDirPath, options, callback)
{
  inputDir = inputDirPath;
  outputDir = outputDirPath;
  lessOptions = minification(options);

  glob(`${inputDir}/**/`, {}).then((folders) =>
  {
    lessOptions = Object.assign(lessOptions, {paths: folders});
    prepareLess(callback);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, () =>
      {
        prepareLess();
      });
    }
  });
};

/**
 * Extract and modify minification options from the lessOptions
 * @param {Object} options lessOptions
 * @return {Object} lessOptions
 */
function minification(options)
{
  if (options.minify === true)
    options.minify = {};

  const minifyOptions = options.minify ? options.minify : null;
  delete options.minify;
  if (minifyOptions)
    options.plugins = [new cleanCss(minifyOptions)];

  return options;
}

/**
 * Pre Less
 */
function prepareLess(callback)
{
  glob(`${inputDir}/**/[!_]*.less`, {}).then((files) =>
  {
    if (files.length == 0 && callback)
      callback(null, true);

    const filesStack = files;
    for (let file of files)
    {
      let {dir, base} = path.parse(file);
      base = base.replace(".less", ".css");
      dir = path.relative(lessDir, dir);
      dir = path.join(outputDir, dir);
      if (!fs.existsSync(dir))
        ensureDir(dir);

      const outputTarget = path.join(dir, base);
      bundleLess(file, outputTarget, filesStack, callback);
    }
  });
}

/**
 * Bundles and output CSS using LESS
 * @param {String} inputFilePath  Path to the source file
 * @param {String} outputFilePath Output target path
 * @param {Function} callback
 */
function bundleLess(inputFilePath, outputFilePath, filesStack, callback)
{
  readFile(inputFilePath, "utf-8").then((data) =>
  {
    return less.render(data.toString(), lessOptions);
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
