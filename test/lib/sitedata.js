"use strict";

const {queryPages} = require.main.require("lib/sitedata");

const siteDataTests = [
  {
    filter: (data) => data.pathname === "sitedata",
    attributeName: "title",
    result: "Sitedata test"
  },
  {
    filter: (data) => data.pathname === "sitedata",
    attributeName: "pathname",
    result: "sitedata"
  },
  {
    filter: (data) => data.pathname === "another/sitedata/permalink",
    attributeName: "pathname",
    result: "another/sitedata/permalink"
  },
  {
    filter: (data) => data.pathname === "sitedata/subfolder/path",
    attributeName: "pathname",
    result: "sitedata/subfolder/path"
  },
  {
    filter: (data) => data.pathname === "sitedata/subfolder/path",
    attributeName: "originalPathname",
    result: "sitedata/subfolder/path"
  },
  {
    filter: (data) => data.pathname === "sitedata/subfolder",
    attributeName: "pathname",
    result: "sitedata/subfolder"
  },
  {
    filter: (data) => data.pathname === "sitedata/subfolder",
    attributeName: "originalPathname",
    result: "sitedata/subfolder"
  },
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
