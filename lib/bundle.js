const {promisify} = require('util');
const glob = promisify(require("glob").glob);
const fs = require("fs");
const path = require("path");
const browserify = require("browserify");

let outputFolder = "";
let bundlerFolder = "";

/**
 * Initializes the module
 * @param  {String} inputDirPath     Bundle input directory location
 * @param  {String} outputDirPath    Output directory location 
 * @param  {Function} callBack 
 *                                  Parameters:
 *                                    * Error message
 *                                    * Boolean, true if Processed successfully
 */
let init = function(inputDirPath, outputDirPath, callback)
{
  bundlerFolder = inputDirPath;
  outputFolder = outputDirPath;
  glob(`${bundlerFolder}/**/`, {}).then((folders) =>
  {
    processBundles(folders, callback);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, () =>
      {
        processBundles(folders);
      });
    }
  });
};

/**
 * Bundle javascript files using Browserify
 * @param  {Array} folders Folders containing .js files
 * @param  {Function} callBack 
 *                                Parameters:
 *                                  * Error message
 *                                  * Boolean, true if Processed successfully
 */
function processBundles(folders, callback)
{
  glob(`${bundlerFolder}/**/[!_]*.js`, {}).then((files) =>
  {
    if (files.length == 0)
      callback(null, true);

    let filesStack = files;
    for (let file of files)
    {
      let {dir, base} = path.parse(file);
      dir = dir.substring(dir.indexOf("js") + 2);
      if (dir)
        dir += "/";
 
      dir = `${outputFolder}/${dir}`;
      if (!fs.existsSync(dir))
         fs.mkdirSync(dir);

      let outputTarget = `${dir}${base}`;
      const bundleFs = fs.createWriteStream(outputTarget);
      const b = browserify();
      b.add(file);
      bundleFs.on("finish", () =>
      {
        console.log(`${outputTarget} is processed`);
      });
      b.bundle().pipe(bundleFs);
      
    }
  });
}

exports.init = init;
