const {assert, expect} = require("chai");
const should = require("chai").should();
const {get} = require("http");
const server = `http://localhost:4000`;

const pathCodes = {
  200: ["", "test", "ru/test", "ru/test", "test/path1", "test/path1/subpath1",
        "public/test/main.css"],
  404: ["index", "test/index", "ru/test/index", "test/index.md", "test/path1.md",
  "test/logo.png", "test/main.css" /*, Fixme "ru/test/path1" */]
};

for (let code in pathCodes)
{
  for (let requestPath of pathCodes[code])
  {
    requestCodes(`${server}/${requestPath}`, Number(code));
  }
}

function requestCodes(url, code)
{
  describe(`Status code for ${url}`, () =>
  {
    it(`should return ${code}`, (done) =>
    {
      get(url, (res) =>
      {
        res.statusCode.should.equal(code);
        done();
      });
    });
  });
}
