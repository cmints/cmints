"use strict";

// Several 3-rd party codes are using `\n` for new line in windows. Sometimes
// it's simpler to clean `\r` in test results as it doesn't suppose to affect
// how new line is rendered on windows.
const clearCarriegeReturn = (args) => args.map((arg) => arg.replace(/\r/gm, ""));

module.exports = {clearCarriegeReturn};