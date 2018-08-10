const {getSitemap} = require("../../lib/sitemap");

const pathToTitles = [
  {
    path: "path1",
    title: "path1 test",
    layout: "default"
  },
  {
    path: "path1/subpath1",
    title: "path1/subpath1 test",
    layout: "default"
  }
];


describe("Page metadata test using getSitemap('path').metadata", () =>
{
  for (const pathToTitle of pathToTitles)
  {
    const {path, title, layout} = pathToTitle;
    it(`title of ${path} page should be ${title} and layout ${layout}`, (done) =>
    {
      const sitemap = getSitemap(path);
      sitemap.metadata.title.should.equal(title);
      sitemap.metadata.layout.should.equal(layout);
      done();
    });
  }
});


describe("Page metadata test using getSitemap('path').metadata", () =>
{
  it("path1 should have a children with path path1/subpath1 and title path1/subpath1 test", (done) =>
  {
    const sitemap = getSitemap("path1");
    sitemap.children[0].metadata.title.should.equal("path1/subpath1 test");
    sitemap.children[0].url.should.equal("path1/subpath1");
    done();
  });
});
