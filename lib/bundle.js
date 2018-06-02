const {promisify} = require('util');
const glob = promisify(require("glob").glob);
const fs = require("fs");
const path = require("path");
const browserify = require("browserify");
const ensureDir = require("fs-extra").ensureDirSync;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const less = require("less");

let filesStack = [];

/**
 * Initializes the module
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location 
 * @param  {Function} callBack 
 *                                  Parameters:
 *                                    * Error message
 *                                    * Boolean, true if Processed successfully
 */
let init = function(inputDirPath, outputDirPath, type, callback)
{
  glob(`${inputDirPath}/**/`, {}).then((folders) =>
  {
    prepareBundles(folders, inputDirPath, outputDirPath, type, callback);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, () =>
      {
        prepareBundles(folders, inputDirPath, outputDirPath, type);
      });
    }
  });
};

/**
 * Bundle javascript files using Browserify
 * @param  {Array} folders Folders containing .js files
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location 
 * @param  {String} extension        Input file extension (ex.: "less", "js") 
 * @param  {Function} callBack 
 *                                Parameters:
 *                                  * Error message
 *                                  * Boolean, true if Processed successfully
 */
function prepareBundles(folders, inputDirPath, outputDirPath, extension,
                        callback)
{
  glob(`${inputDirPath}/**/[!_]*.${extension}`, {}).then((files) =>
  {
    if (files.length == 0)
      callback(null, true);

    // TODO: merge rather than rewrite
    filesStack = files;
    for (let file of files)
    {
      let {dir, base} = path.parse(file);
      // TODO: Refactor me
      if (extension === "js")
        dir = dir.substring(dir.indexOf("js") + 2);
      else if (extension === "less")
        dir = dir.substring(dir.indexOf("less") + 4);
 
      dir = path.join(outputDirPath, dir);
      if (!fs.existsSync(dir))
        ensureDir(dir);

      if (extension === "js")
      {
        const outputTarget = path.join(dir, base);
        bundleBrowserify(file, outputTarget, callback);
      }
      else if (extension === "less")
      {
        const outputTarget = path.join(dir, base.replace("less", "css"));
        bundleLess(file, outputTarget, folders, callback);
      }
    }
  });
}

/**
 * Bundling files using Browserify
 * @param {String} inputFilePath  Path to the source file
 * @param {String} outputFilePath Output target path
 * @param {Function} callback 
 */
function bundleBrowserify(inputFilePath, outputFilePath, callback)
{
  const bundleFs = fs.createWriteStream(outputFilePath);
  const b = browserify();
  b.add(inputFilePath);
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

/**
 * Bundles and output CSS using LESS
 * @param {String} inputFilePath  Path to the source file
 * @param {String} outputFilePath Output target path
 * @param {Function} callback
 */
function bundleLess(inputFilePath, outputFilePath, folders, callback)
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
    console.error(`Error occured in ${inputFilePath}`)
    console.error(err);
  });
}

exports.init = init;
