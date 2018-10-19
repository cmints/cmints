"use strict";

const {slugify} = require.main.require("lib/toc").tocOptions;

const slugifyMaps = [
  ["What is CMintS?", "what-is-cmints"],
  ["{i18n-example-string}", "i18n-example-string"]
];

for (const slugifyMap of slugifyMaps)
{
  slugifyTests(slugifyMap[0], slugifyMap[1]);
}

function slugifyTests(sourceText, slugifiedText)
{
  describe(`"${sourceText}" should be converted to "${slugifiedText}"`, () =>
  {
    it("Should be same", (done) =>
    {
      slugify(sourceText).should.be.equal(slugifiedText);
      done();
    });
  });
}
