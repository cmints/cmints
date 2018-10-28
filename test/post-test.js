"use strict";

const {removeSync} = require("fs-extra");
const testDir = "./test";
const destinationDir = `${testDir}/src-temp`;

removeSync(destinationDir);
