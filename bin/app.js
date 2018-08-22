const {promisify} = require("util");
const i18n = require("../lib/i18n");
const i18nInit = promisify(i18n.init);
const bundler = require("../lib/bundle");
const bundlerInit = promisify(bundler.init);
const {removeSync} = require("fs-extra");
const initSitedata = promisify(require("../lib/sitedata").initSitedata);
const {runServer, generateStatic} = require("../lib/server");
const {runCrowdinSync} = require("../lib/crowdin");
const {createExampleProject} = require("../lib/example");
const argv = require("minimist")(process.argv.slice(2));

// Configurations
const {layoutsDir, lessDir, lessTargetDir, pageDir, browserifyDir, browserifyTargetDir,
  contentDir, localesDir} = require("../config").dirs;
const {i18nOptions} = require("../config");

function prepareApp(callback)
{
  // Remove static content generation target directory
  removeSync(contentDir);

  let i18nWatchDirs = [pageDir, layoutsDir];
  let launchPreparation = [
    initSitedata(),
    i18nInit(localesDir, i18nWatchDirs, i18nOptions),
    bundlerInit(lessDir, lessTargetDir, "less"),
    bundlerInit(browserifyDir, browserifyTargetDir, "js")
  ];

  Promise.all(launchPreparation).then(() =>
  {
    if (callback)
      callback(null, true);
  });
}

if (argv.example)
{
  createExampleProject();
}
else
{
  prepareApp(() =>
  {
    if (argv.static)
      generateStatic(process.exit);
    else if (argv.crowdin)
      runCrowdinSync(argv);
    else
      runServer(argv);
  });
}
