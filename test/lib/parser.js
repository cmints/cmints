"use strict";

const {parsePage} = require.main.require("lib/parser");
const testDir = "./test";
const resultDir = `${testDir}/results`;
const {promisify} = require("util");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const path = require("path");

const parserData = [
  {
    page: "index.md",
    language: "ru",
    resultFile: "index.html"
  },
  {
    page: "helpers/index.ejs",
    language: "ru",
    resultFile: "helpers/index.html"
  },
  {
    page: "helpers/permalink.ejs",
    language: "ru",
    resultFile: "helpers/another-permalink.html"
  }
];

function parserResult(page, language, resultPath)
{
  it(`Comparing parsePage('${page}') for ${language} language, against ${resultPath}`, (done) =>
  {
    const {dir, name, ext} = path.parse(page);
    const pathname = path.join(dir, name);
    let promises = [parsePage(pathname, ext, language),
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

for (const {page, language, resultFile} of parserData)
{
  parserResult(page, language, path.join(resultDir, resultFile));
}
