const fs = require("fs");
const path = require("path");
const {promisify} = require("util");
const request = require("request");
const extra = require("fs-extra");
const remove = promisify(extra.remove);
const admZip = require("adm-zip");
const {srcPath} = require("../config").dirs;

const createExampleProject = () =>
{
  const zipFile = "./tmp.zip";
  request("https://github.com/Manvel/cmints-website/archive/example.zip")
    .pipe(fs.createWriteStream("tmp.zip"))
    .on("close", () => 
    {
      const zip = new admZip(zipFile);
      const zipEntries = zip.getEntries();
      for (const zipEntry of zipEntries)
      {
        const filePath = zipEntry.entryName;
        const destinationDir = `${srcPath}/${path.parse(filePath).dir}`;
        zip.extractEntryTo(filePath, destinationDir, false, true);
        console.log(`${filePath} is extracted`);
      }
  
      console.log("Example is downloaded and extracted");
      remove(zipFile).then(() =>
      {
        process.exit();
      });
    });
}

module.exports = {createExampleProject};
