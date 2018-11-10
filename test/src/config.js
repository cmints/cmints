"use strict";

const argv = require("minimist")(process.argv.slice(2));

if (argv.double)
{
  module.exports = {generationType: "Double"};
}
else if (argv.addgzip)
{
  module.exports = {gzip: true, generationType: "Cache"};
}
else
{
  module.exports = {example: "http://localhost:3000/test/example-test.zip", generationType: "Cache"};
}
