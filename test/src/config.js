"use strict";

const argv = require("minimist")(process.argv.slice(2));

if (argv.double)
{
  module.exports = {i18nOptions: {type: "Double"}};
}
else if (argv.addgzip)
{
  module.exports = {gzip: true};
}
else
{
  module.exports = {example: {default: "http://localhost:3000/test/example-test.zip"}};
}
