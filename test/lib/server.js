const {assert, expect} = require("chai");
const should = require("chai").should();
const {get} = require("http");
const server = `http://localhost:4000`;
const {contentDir} = require.main.require("config");
const fs = require("fs");
const fileExist = fs.existsSync;
const isCache = process.argv[3] != "--no-cache";

const pathCodes = {
  200: ["test", "ru/test", "ru/test", "test/path1", "test/path1/subpath1",
        "test/main.css"],
  404: ["index", "test/index", "ru/test/index", "test/index.md", "test/path1.md",
        "test/logo.png", "public/test/main.css", "de/test/path1"]
};
const caches = ["en/test/index.html", "ru/test/index.html", "en/test/path1.html",
                "test/main.css"];

function testCaching()
{
  // Testing the cache
  describe(`Test if files have been cached`, () =>
  {
    for (let cachedFile of caches)
    {
      const filePath = `${contentDir}/${cachedFile}`;
      describe(`Does ${filePath} exist`, () =>
      {
        it("Should exist", (done) =>
        {
          fileExist(filePath).should.equal(true);
          done();
        });
      });
    }
  });
}

function requestCodes(url, code)
{
  describe(`Status code for ${url}`, () =>
  {
    it(`should return ${code}`, (done) =>
    {
      get(url, (res) =>
      {
        res.statusCode.should.equal(code);
        done();
      });
    });
  });
}

for (let code in pathCodes)
{
  for (let requestPath of pathCodes[code])
  {
    requestCodes(`${server}/${requestPath}`, Number(code));
  }
}

if (isCache)
  testCaching();
