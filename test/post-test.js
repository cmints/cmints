"use strict";

const {removeSync, moveSync} = require("fs-extra");
const {srcPath} = require("../config").dirs;

removeSync(srcPath);
moveSync(`${srcPath}-tmp`, srcPath)
