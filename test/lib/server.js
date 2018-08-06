require("chai").should();
const {get} = require("http");
const server = "http://localhost:3000";
const {contentDir} = require.main.require("config").dirs;
const fs = require("fs");
const fileExist = fs.existsSync;
const argv = require("minimist")(process.argv.slice(2));
const {finishRemoveTestDir} = require("../post-test");
const gzipExt = ".gzip";

const pathCodes = {
  200: ["", "ru", "ru", "path1", "path1/subpath1",
        "main.css", "verification", "?query#fragment",
        "no-extension"],
  404: ["index", "index", "ru/index", "index.md", "path1.md",
        "logo.png", "public/main.css", "de/path1", "nofile",
        "js/modules/_robot.js", "css/modules/_variables.js"],
  501: ["unsupported.smth"]
};
const caches = ["en/index.html", "ru/index.html",
                "en/path1.html", "main.css"];

 // Add Gzip to the caches array
const gzipCaches = caches.map((cachedFile) => cachedFile + gzipExt);
caches.push(...gzipCaches);

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


