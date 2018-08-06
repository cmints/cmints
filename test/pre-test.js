const {copySync, moveSync, ensureDirSync} = require("fs-extra");
const {srcPath} = require("../config").dirs;
const targetDir = "./test/src";

ensureDirSync(srcPath);
moveSync(srcPath, `${srcPath}-tmp`);
copySync(targetDir, srcPath);
