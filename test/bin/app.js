const {promisify} = require("util");
const i18n = require("../../lib/i18n");
const i18nInit = promisify(i18n.init);
const bundler = require("../../lib/bundle");
const bundlerInit = promisify(bundler.init);
const initSitedata = promisify(require("../../lib/sitedata").initSitedata);
const {removeSync} = require("fs-extra");

// Configurations
const {layoutsDir, lessDir, lessTargetDir, pageDir, browserifyDir, browserifyTargetDir,
  contentDir, localesDir} = require("../../config").dirs;
const {i18nOptions} = require("../../config");


const prepareApp = (callback) =>
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
};

exports.prepareApp = prepareApp;
