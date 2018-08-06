const {copySync, moveSync} = require("fs-extra");
const {srcPath} = require("../config").dirs;
const targetDir = "./test/src";
const {prepareApp} = require("./bin/app");
const {generateStatic} = require("../lib/server");
const argv = require("minimist")(process.argv.slice(2));

moveSync(srcPath, `${srcPath}-tmp`);
copySync(targetDir, srcPath);

if (argv.static)
{
  prepareApp(() =>
  {
    generateStatic(process.exit);
  });
}
