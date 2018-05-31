const {promisify} = require("util");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const resultDir = "./test/results";
const {publicDir} = require("../../config").dirs;

const files = [
  [`${publicDir}/js/test/beep.js`, `${resultDir}/public/js/test/beep.js`],
  [`${publicDir}/js/test/subFolder/boop.js`, `${resultDir}/public/js/test/subFolder/boop.js`]
]

for (const file of files)
{
  compare(file[0], file[1]);
}



function compare(sourceFile, resultFile)
{
  describe(`Content of ${sourceFile} and ${resultFile}`, () =>
  {
    it(`Should be same`, (done) =>
    {
      Promise.all([readFile(sourceFile, "utf-8"), readFile(resultFile, "utf-8")]).then(([sourceContent, resultContent]) =>
      {
        let smth = sourceContent == resultContent;
        sourceContent.should.be.equal(resultContent)
        done();
      }).catch((err) =>
      {
        done(err);
      });
    });
  });
}
