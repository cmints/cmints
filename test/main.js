/*
  Simulating app.js
*/
const {promisify} = require('util');
const i18n = require("../lib/i18n");
const i18nInit = promisify(i18n.init);
const lessProcessor = require("../lib/less-processor");
const lessProcessorInit = promisify(lessProcessor.init);
const {initSitemap} = require("../lib/sitemap");
const {runServer, generateStatic} = require("../lib/server");
const {runCrowdinSync} = require("../lib/crowdin");
const argv = require("minimist")(process.argv.slice(2));

// Configurations
const {layoutsDir, lessDir, lessTargetDir, pageDir,
  contentDir, localesDir} = require("../config").dirs;

function prepareApp(callback)
{
  // Remove static content generation target directory
  remove(contentDir);

  // Initialize sitemap
  initSitemap();

  let i18nWatchDirs = [pageDir, layoutsDir];
  let launchPreparation = [
    i18nInit(localesDir, i18nWatchDirs),
    lessProcessorInit(lessDir, lessTargetDir)
  ];

  Promise.all(launchPreparation).then(() =>
  {
    if (callback)
      callback(null, true);
  });
}
/*
  End of simulation
*/



const {copy, remove} = require("fs-extra");
const targetDir = "./test/src";
const {srcPath} = require.main.require("config").dirs;
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

// List of folders to be removed after the test
const testFolders =["src/test/", "src/pages/test/", "src/locales/en/test/",
                    "src/locales/ru/test/", "src/theme/layouts/test/",
                    "content/en/test", "content/ru/test", "content/test",
                    "src/public/test/"];

function importTest(name, path)
{
  describe(name, () =>
  {
    require(path);
  });
}

describe("Testing cmints", () =>
{
  before((done) =>
  {
    copy(targetDir, srcPath).then(() =>
    {
      prepareApp(() =>
      {
        runServer(argv);
        done();
      })
    });
  });

  importTest("Server test", './lib/server');
  importTest("I18n test", './lib/i18n');
  importTest("Parser test", './lib/parser');

  after((done) =>
  {
    for (let testFolder of testFolders)
      remove(testFolder);

    done();
    setTimeoutPromise(50).then(() =>
    {
      process.exit();
    });
  })
});
