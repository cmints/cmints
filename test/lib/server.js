require("chai").should();
const {get} = require("http");
const server = "http://localhost:3000";
const {contentDir} = require.main.require("config").dirs;
const fs = require("fs");
const fileExist = fs.existsSync;
const argv = require("minimist")(process.argv.slice(2));
const {finishRemoveTestDir} = require("../post-test");

const pathCodes = {
  200: ["test", "ru/test", "ru/test", "test/path1", "test/path1/subpath1",
        "test/main.css", "test/verification", "test?query#fragment",
        "test/no-extension"],
  404: ["index", "test/index", "ru/test/index", "test/index.md", "test/path1.md",
        "test/logo.png", "public/test/main.css", "de/test/path1", "test/nofile",
        "js/test/modules/_robot.js", "css/test/modules/_variables.js"],
  501: ["test/unsupported.smth"]
};
const caches = ["en/test/index.html", "ru/test/index.html",
                "en/test/path1.html", "test/main.css"];

function testCaching()
{
  // Testing the cache
  describe("Test if files have been cached", () =>
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

if (argv.static)
{
  // THIS TEST IS CALLED DIRECTLY
  describe("Testing static content generation", () =>
  {
    testCaching();
    after(finishRemoveTestDir);
  });
}
else
{
  for (let code in pathCodes)
  {
    for (let requestPath of pathCodes[code])
    {
      requestCodes(`${server}/${requestPath}`, Number(code));
    }
  }

  testCaching();
}


