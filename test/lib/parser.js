const {parsePage} = require.main.require("lib/parser");
const testDir = "./test";
const resultDir = `${testDir}/results`;
const {promisify} = require("util");
const fs = require("fs");
const readFile = promisify(fs.readFile);

let parserArgs = ["index", ".md", "ru"];
let resultFile = "index.html";
parserResult(parserArgs, `${resultDir}/${resultFile}`);

function parserResult(parserArgs, resultPath)
{
  it(`Comparing parsePage('${parserArgs.join("', '")}'), against ${resultPath}`, (done) =>
  {
    let promises = [parsePage(...parserArgs),
                    readFile(resultPath, "utf-8")];
    Promise.all(promises).then((results) =>
    {
      let [parserResult, predefinedFile] = results;
      parserResult.should.equal(predefinedFile);
      done();
    }).catch((err) =>
    {
      done(err);
    });
  });
}
