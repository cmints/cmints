"use strict";

const path = require("path");
global.rootRequire = name => require(path.join(__dirname, "../", name));

const {runServer} = rootRequire("./lib/server");
const argv = require("minimist")(process.argv.slice(2));
const {init} = rootRequire("./lib/cmints");

function importTest(name, path)
{
  describe(name, () =>
  {
    require(path);
  });
}

function runMainTest()
{
  describe("Testing cmints", () =>
  {
    before((done) =>
    {
      init(() =>
      {
        runServer(argv);
        done();
      });
    });

    importTest("Server test", "./lib/server");
    importTest("I18n test", "./lib/i18n");
    importTest("Sitedata test", "./lib/sitedata");
    importTest("Parser test", "./lib/parser");
    importTest("Bundling test", "./lib/bundle");
    importTest("Slugify test", "./lib/slugify");
    importTest("Example test", "./lib/example");

    after((done) =>
    {
      done();
    });
  });
}

process.on("exit", () =>
{
  require("./post-test");
});

runMainTest();
