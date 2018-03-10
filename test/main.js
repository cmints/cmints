const {copy, remove} = require("fs-extra");
const targetDir = "./test/src";
const {srcPath} = require.main.require("config");

// List of folders to be removed after the test
const testFolders =["src/public/test/", "src/pages/test/",
                    "src/locales/ru/test/", "src/theme/layouts/test/"];

function importTest(name, path)
{
  describe(name, () =>
  {
      require(path);
  });
}

describe("Testing cmints", () =>
{
  before((done) =>
  {
    copy(targetDir, srcPath).then(() =>
    {
      done();
    });
  });

  importTest("Server test", './bin/server');
  importTest("I18n test", './lib/i18n');
  importTest("Parser test", './lib/parser');

  after((done) =>
  {
    for (let testFolder of testFolders)
      remove(testFolder);
    done();
  })
});
