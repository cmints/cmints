const {runServer, generateStatic} = require("../lib/server");
const {runCrowdinSync} = require("../lib/crowdin");
const {init} = require("../lib/cmints");
const {createExampleProject} = require("../lib/example");
const argv = require("minimist")(process.argv.slice(2));

if (argv.example)
{
  createExampleProject();
}
else
{
  init(() =>
  {
    if (argv.static)
      generateStatic(process.exit);
    else if (argv.crowdin)
      runCrowdinSync(argv);
    else
      runServer(argv);
  });
}
