"use strict";

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
        "no-extension", "2018/10/20/permalink", "ru/2018/10/20/permalink",
        "permalinkpath", "toppermalinktarget", "images/logo.png"],
  501: ["unsupported.smth"]
};

const notFounds =
{
  // return defined 404.md page
  "text/html": ["index", "ru/index", "nofile", "de/path1", "permalinks",
                "ru/permalinks", "permalinks/subpath", "toplevelpermalink",
                "images"],
  // no content-type header
  "none": ["index.md", "path1.md", "logo.png", "public/main.css",
           "js/modules/_robot.js", "css/modules/_variables.js"]
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

function requestCodes(url, code, type)
{
  describe(`Status code for ${url}`, () =>
  {
    let contentTypeText = "";
    if (type)
      contentTypeText = ` and contentType is ${type}`;

    it(`res.statusCode is ${code}${contentTypeText}`, (done) =>
    {
      get(url, (res) =>
      {
        res.statusCode.should.equal(code);
        if (type)
        {
          const contentType = res.headers["content-type"];
          if (type == "none")
          {
            (typeof contentType).should.equal("undefined");
          }
          else
          {
            res.headers["content-type"].should.equal(type);
          }
        }
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

  for (const type in notFounds)
  {
    const paths = notFounds[type];
    for (const path of paths)
    {
      // const contentType = type == "none" ? null : type;
      requestCodes(`${server}/${path}`, 404, type);
    }
  }

  testCaching();
}


