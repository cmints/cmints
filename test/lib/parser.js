"use strict";

const {parsePage} = require.main.require("lib/parser");
const testDir = "./test";
const resultDir = `${testDir}/results`;
const {promisify} = require("util");
const fs = require("fs");
const readFile = promisify(fs.readFile);

let parserArgs = [];
let resultFile = "";
// Testing index.html
parserArgs = ["index", ".md", "ru"];
resultFile = "index.html";
parserResult(parserArgs, `${resultDir}/${resultFile}`);
// Testing helpers helpers/index.html
parserArgs = ["helpers/index", ".ejs", "ru"];
resultFile = "helpers/index.html";
parserResult(parserArgs, `${resultDir}/${resultFile}`);
// Testing permalink helpers
parserArgs = ["helpers/permalink", ".ejs", "ru"];
resultFile = "helpers/another-permalink.html";
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
