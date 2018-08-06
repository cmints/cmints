const util = require("util");
const setTimeoutPromise = util.promisify(setTimeout);
const {removeSync, moveSync} = require("fs-extra");
const {srcPath} = require("../config").dirs;

const finishRemoveTestDir = (done) =>
{
  removeSync(srcPath);
  moveSync(`${srcPath}-tmp`, srcPath)

  done();
  setTimeoutPromise(50).then(() =>
  {
    process.exit();
  });
}

module.exports = {finishRemoveTestDir}
