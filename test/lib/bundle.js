const {promisify} = require("util");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const resultDir = "./test/results";
const {publicDir} = require("../../config").dirs;

const files = [
  [`${publicDir}/js/test/beep.js`,
   `${resultDir}/public/js/test/beep.js`],
  [`${publicDir}/js/test/subFolder/boop.js`,
   `${resultDir}/public/js/test/subFolder/boop.js`],
  [`${publicDir}/css/test/subFolder/button.css`,
   `${resultDir}/public/css/test/subFolder/button.css`],
  [`${publicDir}/css/test/main.css`,
   `${resultDir}/public/css/test/main.css`]
];

for (const file of files)
{
  compare(file[0], file[1]);
}

const privateModule = `${publicDir}/js/test/modules/_robot.js`;

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
        sourceContent.should.be.equal(resultContent)
        done();
      }).catch((err) =>
      {
        done(err);
      });
    });
  });
}
