"use strict";

const {promisify} = require("util");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const resultDir = "./test/results";
const {publicDir} = require("../../config").dirs;

const files = [
  [`${publicDir}/js/beep.js`,
   `${resultDir}/public/js/beep.js`],
  [`${publicDir}/js/subFolder/boop.js`,
   `${resultDir}/public/js/subFolder/boop.js`],
  [`${publicDir}/css/subFolder/button.css`,
   `${resultDir}/public/css/subFolder/button.css`],
  [`${publicDir}/css/main.css`,
   `${resultDir}/public/css/main.css`]
];

for (const file of files)
{
  compare(file[0], file[1]);
}

const privateModule = `${publicDir}/js/modules/_robot.js`;

describe(`Check if private module ${privateModule} exists`, () =>
{
  it("Private module shouldn't exist", (done) =>
  {
    const isModuleExist = fs.existsSync(privateModule);
    isModuleExist.should.be.false;
    done();
  });
});

function compare(sourceFile, resultFile)
{
  describe(`Content of ${sourceFile} and ${resultFile}`, () =>
  {
    it("Should be same", (done) =>
    {
      Promise.all([readFile(sourceFile, "utf-8"),
                   readFile(resultFile, "utf-8")]).then(([sourceContent,
                                                          resultContent]) =>
      {
        sourceContent.should.be.equal(resultContent);
        done();
      }).catch((err) =>
      {
        done(err);
      });
    });
  });
}
