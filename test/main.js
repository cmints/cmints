const {runServer} = require("../lib/server");
const argv = require("minimist")(process.argv.slice(2));
const {prepareApp} = require("./bin/app");
const {finishRemoveTestDir} = require("./post-test");


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
      prepareApp(() =>
      {
        runServer(argv);
        done();
      });
    });
  
    importTest("Server test", "./lib/server");
    importTest("I18n test", "./lib/i18n");
    importTest("Sitemap test", "./lib/sitemap");
    importTest("Parser test", "./lib/parser");
    importTest("Bundling test", "./lib/bundle");
    importTest("Slugify test", "./lib/slugify");

    after(finishRemoveTestDir);
  });
}

runMainTest();
