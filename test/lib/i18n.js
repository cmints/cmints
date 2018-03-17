const {promisify} = require('util');
const i18n = require.main.require("lib/i18n");
const i18nInit = promisify(i18n.init);
const {srcPath} = require.main.require("config");

const locale = "ru";
const pagePath = "test/index";

const translationStrings = [
  ["# {test-heading-1[Page Heading] My heading}", "# Заголовок"],
  ["{test-fix <fix>CMintS</fix> uses <fix>fix</fix> tag}",
   "fix тэг используется CMintS-ом"],
  ["{test-anchor1 This is <a href='https//www.example1.com'>first link</a> and <а href='https//www.example2.com'>second link</a>}",
   "Это <a href='https//www.example2.com'>вторая ссылка</a> и <a href='https//www.example1.com'>первая</a>"]
];

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

  for (const translationString of translationStrings)
    translate(translationString[0], translationString[1]);
});

function translate(source, result)
{
  describe(`String "${source}" at "${pagePath}" path for "${locale} locale"`, () =>
  {
    it(`Should match the output of ${result}`, (done) =>
    {
      const translation = i18n.translate(source, pagePath, locale);
      translation.should.equal(result);
      done();
    });
  });
}
