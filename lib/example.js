"use strict";

const fs = require("fs");
const {execSync} = require("child_process");
const path = require("path");
const request = require("request");
const {removeSync, pathExistsSync, copySync} = require("fs-extra");
const admZip = require("adm-zip");
const {dirs, example} = require("../config");
const {srcPath, tempDir} = dirs;
const tempZip = `${tempDir}/tmp.zip`;
const {ensureDirSync} = require("fs-extra");

function downloadProject(callback)
{
  ensureDirSync(tempDir);
  console.log("Downloading example project...");
  request(example).pipe(fs.createWriteStream(tempZip)).on("close", () =>
  {
    callback();
  });
}

function extractProjectZipfiles()
{
  console.log("Extracting zip files...");
  const zip = new admZip(tempZip);
  const mainEntry = zip.getEntries()[0].entryName;
  zip.extractAllTo(tempDir, true);
  // use copySync instead of moveSync as the later one can remove execution dir
  // in linux on `cmints --example`
  copySync(path.join(tempDir, mainEntry), srcPath, {overwrite: true});
  removeSync(tempDir);
}

const createExampleProject = (callback) =>
{
  downloadProject(() => {
    extractProjectZipfiles();
    console.log("Building...");
    execSync(`npm --prefix ${srcPath} install ${srcPath}`);
    console.log("Example project is ready.");
    callback(null, true);
  });
};

process.on("uncaughtException", (e) =>
{
  console.log(e);
  if (pathExistsSync(tempDir))
    removeSync(tempDir);
  process.exit(1);
});

module.exports = {createExampleProject};
