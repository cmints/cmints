const {promisify} = require('util');
const i18n = require.main.require("lib/i18n");
const i18nInit = promisify(i18n.init);
const {srcPath} = require.main.require("config");

const locale = "ru";
const pagePath = "test/index";

describe("Check translate() function", () =>
{
  before((done) =>
  {
    i18nInit(`${srcPath}/locales`, []).then((ready) =>
    {
      if (ready)
        done();
    });
  });

  const source = "# {test-heading-1[Page Heading] My heading}";
  const result = "# Заголовок";
  translate(source, result);
});

function translate(source, result)
{
  describe(`String "${source}" at "${pagePath}" path for "${locale} locale"`, () =>
  {
    it(`Should match the output of ${result}`, (done) =>
    {
      const translation = i18n.translate(source, pagePath, locale);
      translation.should.equal("# Заголовок");
      done();
    });
  });
}
