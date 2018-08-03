const {runServer} = require("../lib/server");
const argv = require("minimist")(process.argv.slice(2));
const {prepareApp} = require("./bin/app");
const {copyTestDir, finishRemoveTestDir} = require("./prepost");


function importTest(name, path)
{
  describe(name, () =>
  {
    require(path);
  });
}

function runRegularTest()
{
  describe("Testing cmints", () =>
  {
    before((done) =>
    {
      copyTestDir().then(() =>
      {
        prepareApp(() =>
        {
          runServer(argv);
          done();
        })
      });
    });
  
    importTest("Server test", "./lib/server");
    importTest("I18n test", "./lib/i18n");
    importTest("Parser test", "./lib/parser");
    importTest("Bundling test", "./lib/bundle");
    importTest("Slugify test", "./lib/slugify");
  
    after(finishRemoveTestDir);
  });
}
const {generateStatic} = require.main.require("lib/server");

if (argv.static)
{
  copyTestDir().then(() =>
  {
    prepareApp(() =>
    {
      generateStatic(process.exit);
    })
  });
}
else
{
  runRegularTest();
}
