const {queryPages} = require.main.require("lib/sitedata");

const siteDataTests = [
  {
    filter : (data) => data.path === "sitedata",
    attributeName: "title",
    result: "Sitedata test"
  },
  {
    filter : (data) => data.path === "sitedata",
    attributeName: "path",
    result: "sitedata"
  },
  {
    filter : (data) => data.path === "another/sitedata/permalink",
    attributeName: "path",
    result: "another/sitedata/permalink"
  }
];

for (const siteDataTest of siteDataTests)
{
  const {filter, attributeName, result} = siteDataTest;
  slugifyTests(filter, attributeName, result);
}

function slugifyTests(filter, attributeName, result)
{
  describe(`Filter: "${filter.toString()}" ${attributeName} attribute should be "${result}"`, () =>
  {
    it("Should be same", (done) =>
    {
      queryPages(filter)[0][attributeName].should.be.equal(result);
      done();
    });
  });
}
