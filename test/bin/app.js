const {promisify} = require("util");
const i18n = require("../../lib/i18n");
const i18nInit = promisify(i18n.init);
const bundler = require("../../lib/bundle");
const bundlerInit = promisify(bundler.init);
const {initSitemap} = require("../../lib/sitemap");
const {removeSync} = require("fs-extra");

// Configurations
const {layoutsDir, lessDir, lessTargetDir, pageDir, browserifyDir, browserifyTargetDir,
  contentDir, localesDir} = require("../../config").dirs;
const {defaultLocale, i18nPrefix, i18nPostfix} = require("../../config");


const prepareApp = (callback) =>
{
  // Remove static content generation target directory
  removeSync(contentDir);

  // Initialize sitemap
  initSitemap();

  let i18nWatchDirs = [pageDir, layoutsDir];
  let launchPreparation = [
    i18nInit(localesDir, i18nWatchDirs, {defaultLocale, prefix: i18nPrefix, postfix: i18nPostfix}),
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
