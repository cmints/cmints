"use strict";

const {promisify} = require("util");
const {watch, existsSync} = require("fs");
const i18n = require("./i18n");
const i18nInit = promisify(i18n.init);
const bundleLess = promisify(require("./bundleLess").initLess);
const bundleBrowserify = promisify(require("./bundleBrowserify")
  .initBrowserify);
const {removeSync} = require("fs-extra");
const initSitedata = promisify(require("./sitedata").initSitedata);

// Configurations
const {layoutsDir, lessDir, lessTargetDir, pageDir, browserifyDir,
  browserifyTargetDir, contentDir, localesDir} = require("../config").dirs;
const {i18nOptions, loadUserConfig, userConfigFile,
  root} = require("../config");

const init = (callback) =>
{
  // Remove static content generation target directory
  removeSync(contentDir);

  // Watch user config file changes
  if (existsSync(userConfigFile))
    watch(userConfigFile, {}, loadUserConfig);

  i18nOptions.root = root;
  let i18nWatchDirs = [pageDir, layoutsDir];
  let launchPreparation = [
    initSitedata(),
    i18nInit(localesDir, i18nWatchDirs, i18nOptions),
    bundleBrowserify(browserifyDir, browserifyTargetDir),
    bundleLess(lessDir, lessTargetDir)
  ];

  Promise.all(launchPreparation).then(() =>
  {
    if (callback)
      callback(null, true);
  });
};

exports.init = init;
