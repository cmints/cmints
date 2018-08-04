const targetDir = "./test/src";
const util = require("util");
const setTimeoutPromise = util.promisify(setTimeout);
const {copy, remove} = require("fs-extra");
const {srcPath} = require.main.require("config").dirs;

// List of folders to be removed after the test
const testFolders =["src/test/", "src/pages/test/", "src/locales/en/test/",
                    "src/locales/ru/test/", "src/theme/layouts/test/",
                    "content/en/test", "content/ru/test", "content/test",
                    "src/public/test/", "src/public/js/test",
                    "src/theme/js/test/", "src/public/css/test/",
                    "src/theme/less/test/"];


const copyTestDir = () =>
{
  return copy(targetDir, srcPath);
}

const finishRemoveTestDir = (done) =>
{
  for (let testFolder of testFolders)
    remove(testFolder);

  done();
  setTimeoutPromise(50).then(() =>
  {
    process.exit();
  });
}

module.exports = {copyTestDir, finishRemoveTestDir}
