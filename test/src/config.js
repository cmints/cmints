"use strict";

const argv = require("minimist")(process.argv.slice(2));

if (argv.addgzip)
{
  module.exports = {gzip: true};
}
else
{
  module.exports = {example: "http://localhost:3000/test/example-test.zip"};
}
