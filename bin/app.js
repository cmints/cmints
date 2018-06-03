const {promisify} = require('util');
const i18n = require("../lib/i18n");
const i18nInit = promisify(i18n.init);
const bundler = require("../lib/bundle");
const bundlerInit = promisify(bundler.init);
const {removeSync} = require("fs-extra");
const {initSitemap} = require("../lib/sitemap");
const {runServer, generateStatic} = require("../lib/server");
const {runCrowdinSync} = require("../lib/crowdin");
const {createExampleProject} = require("../lib/example");
const argv = require("minimist")(process.argv.slice(2));

// Configurations
const {layoutsDir, lessDir, lessTargetDir, pageDir, browserifyDir, browserifyTargetDir,
  contentDir, localesDir} = require("../config").dirs;

function prepareApp(callback)
{
  // Remove static content generation target directory
  removeSync(contentDir);

  // Initialize sitemap
  initSitemap();

  let i18nWatchDirs = [pageDir, layoutsDir];
  let launchPreparation = [
    i18nInit(localesDir, i18nWatchDirs),
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
      generateStatic();
    else if (argv.crowdin)
      runCrowdinSync(argv);
    else
      runServer(argv);
  });
}
