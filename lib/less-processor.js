const {promisify} = require('util');
const glob = promisify(require("glob").glob);
const fs = require("fs");
const less = require("less");
const path = require("path");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
let outputFolder = "";
let lessFolder = "";

/**
 * Initializes the module
 * @param  {String} lessDirPath     Less directory location
 * @param  {String} outputDirPath   Output directory location 
 */
let init = function(lessDirPath, outputDirPath)
{
  lessFolder = lessDirPath;
  outputFolder = outputDirPath;
  glob(`${lessFolder}/**/`, {}).then((folders) =>
  {
    processLess(folders);
    for (let folder of folders)
    {
      // {recursive: true} is only supported in MacOS and Windows
      fs.watch(folder, {}, (eventType, fileName) =>
      {
        processLess(folders);
      });
    }
  });
};

/**
 * Generates CSS output using .lessc files 
 * @param  {Array} folders Folders containing .less and .lessc files
 */
function processLess(folders)
{
  glob(`${lessFolder}/**/*.lessc`, {}).then((files) =>
  {
    for (let file of files)
    {
      let {dir, base} = path.parse(file);
      dir = dir.substring(dir.indexOf("less") + 5);
      if (dir)
        dir += "/";
 
      dir = `${outputFolder}/css/${dir}`;
      if (!fs.existsSync(dir))
         fs.mkdirSync(dir);

      let outputTarget = `${dir}${base.replace("lessc", "css")}`;
      readFile(file, "utf-8").then((data) =>
      {
        return less.render(data.toString(), {paths: folders});
      }).then((output) =>
      {
        return writeFile(outputTarget, output.css, "utf8");
      }).then(() =>
      {
        console.log(`${outputTarget} has been processed`);
      }).catch((err) =>
      {
        console.error(err);
      });
    }
  });
}

exports.init = init;
