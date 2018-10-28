"use strict";

const {copySync, emptyDirSync} = require("fs-extra");
const testDir = "./test";
const sourceDir = `${testDir}/src`;
const destinationDir = `${testDir}/src-temp`;

emptyDirSync(destinationDir);
copySync(sourceDir, destinationDir);
