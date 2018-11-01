"use strict";

require("chai").should();
const {get} = require("http");
const server = "http://localhost:3000";
const {contentDir} = require.main.require("config").dirs;
const fs = require("fs");
const fileExist = fs.existsSync;
const argv = require("minimist")(process.argv.slice(2));
const gzipExt = ".gzip";

const pathCodes = {
  200: ["", "ru", "ru", "path1", "path1/subpath1",
        "main.css", "verification", "?query#fragment",
        "no-extension", "2018/10/20/permalink", "ru/2018/10/20/permalink",
        "permalinkpath", "toppermalinktarget", "images/logo.png",
        "hello-world.html", "markup"],
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
           "js/modules/_robot.js", "css/modules/_variables.js", "markup.html"]
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
        let shouldExist = true;
        if (!argv.testgzip && filePath.includes(gzipExt))
          shouldExist = false;
        it(`Should${shouldExist ? "" : "n't"} exist`, (done) =>
        {
          if (shouldExist)
          {
            fileExist(filePath).should.equal(shouldExist);
          }
          else
          {
            fileExist(filePath).should.equal(shouldExist);
          }
          done();
        });
      });
    }
  });
}

const generatedPermalinks = [
  ["en/2018/10/20/permalink.html", true],
  ["ru/2018/10/20/permalink.html", true],
  ["ru/permalinks/index.html", false],
  ["en/permalinks/index.html", false]
];

function testPermalinkGeneration()
{
  describe("Test if permalink files are generated correctly", () =>
  {
    for (const [generatedFile, exists] of generatedPermalinks)
    {
      const filePath = `${contentDir}/${generatedFile}`;
      it(`${filePath} Should${exists ? "" : "n't"} exist`, (done) =>
      {
        if (exists)
        {
          fileExist(filePath).should.equal(exists);
        }
        else
        {
          fileExist(filePath).should.equal(exists);
        }
        done();
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
  describe(`Testing static content generation ${argv.testgzip ? "" : "with cache"}`, () =>
  {
    testCaching();
    testPermalinkGeneration();
    after(process.exit);
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


