"use strict";

const {runServer, generateStatic} = require("../lib/server");
const {runCrowdinSync} = require("../lib/crowdin");
const {init} = require("../lib/cmints");
const {createExampleProject} = require("../lib/example");
const argv = require("minimist")(process.argv.slice(2));
const {deploy} = require("./deploy");

if (argv.example)
{
  createExampleProject(() =>
  {
    process.exit();
  });
}
else
{
  init(() =>
  {
    if (argv.static)
    {
      generateStatic(() =>
      {
        if (argv.deploy)
          deploy();
        else
          process.exit();
      });
    }
    else if (argv.crowdin)
      runCrowdinSync(argv);
    else if (argv.start)
      runServer(argv);
    else
    {
      console.log("No command matched, see: https://cmints.io/documentation");
      process.exit();
    }
  });
}
