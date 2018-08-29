const fs = require("fs");
const request = require("request");
const {removeSync} = require("fs-extra");
const admZip = require("adm-zip");
const {srcPath, tempDir} = require("../config").dirs;
const tempZip = `${tempDir}/tmp.zip`;
const ensureDirSync = require("fs-extra").ensureDirSync;
const projectName = "cmints-website";
const branchName = "example";

const createExampleProject = () =>
{
  ensureDirSync(tempDir);
  request(`https://github.com/Manvel/${projectName}/archive/${branchName}.zip`)
    .pipe(fs.createWriteStream(tempZip))
    .on("close", () => 
    {
      const zip = new admZip(tempZip);
      zip.extractAllTo(srcPath);
      removeSync(tempDir);
      console.log("Example is downloaded and extracted");
      process.exit();
    });
}

module.exports = {createExampleProject};
