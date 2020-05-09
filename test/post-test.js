"use strict";

const {remove} = require("fs-extra");
const testDir = "./test";
const destinationDir = `${testDir}/src-temp`;

remove(destinationDir);
