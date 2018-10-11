const fs = require("fs");
const path = require("path");
const request = require("request");
const {removeSync, moveSync, pathExistsSync} = require("fs-extra");
const admZip = require("adm-zip");
const {srcPath, tempDir} = require("../config").dirs;
const tempZip = `${tempDir}/tmp.zip`;
const ensureDirSync = require("fs-extra").ensureDirSync;
const projectName = "cmints-website";
const branchName = "example";

const createExampleProject = () =>
{
  ensureDirSync(tempDir);
  console.log("Downloading example project...");
  request(`https://github.com/Manvel/${projectName}/archive/${branchName}.zip`)
    .pipe(fs.createWriteStream(tempZip))
    .on("close", () => 
    {
      console.log("Zip file downloaded. Extracting...");
      const zip = new admZip(tempZip);
      const mainEntry = zip.getEntries()[0].entryName;
      zip.extractAllTo(tempDir, true);
      moveSync(path.join(tempDir, mainEntry), srcPath);
      removeSync(tempDir);
      console.log("Example is extracted");
      process.exit();
    });
}

process.on("uncaughtException", (e) => {
  console.log(e);
  if (pathExistsSync(tempDir))
    removeSync(tempDir);
  process.exit(1);
});

module.exports = {createExampleProject};
