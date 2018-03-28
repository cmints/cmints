const {createServer} = require("http");
const {promisify} = require('util');
const fs = require("fs");
const path = require("path");
const i18n = require("../lib/i18n");
const i18nInit = promisify(i18n.init);
const lessProcessor = require("../lib/less-processor");
const lessProcessorInit = promisify(lessProcessor.init);
const readFile = promisify(fs.readFile);
const fileExist = fs.existsSync;
const {parsePage} = require("../lib/parser");
const outputFile = promisify(require("fs-extra").outputFile);
const {remove} = require("fs-extra");
const glob = promisify(require("glob").glob);
const {initSitemap} = require("../lib/sitemap");
const {runServer, generateStatic} = require("../lib/server");

// Configurations
const {publicDir, layoutsDir, partialsDir, lessDir, lessTargetDir, pageDir,
  contentDir, localesDir, srcPath, pageExtestions} = require("../config");

function prepareApp(callback)
{
  // Remove static content generation target directory
  remove(contentDir);

  // Initialize sitemap
  initSitemap();

  let i18nWatchDirs = [pageDir, partialsDir, layoutsDir];
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

prepareApp(() =>
{
  if (process.argv[2] == "--static")
    generateStatic();
  else
    runServer(process.argv[2] != "--no-cache");
});
