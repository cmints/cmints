"use strict";

const {promisify} = require("util");
const example = require.main.require("lib/example");
const createExampleProject = promisify(example.createExampleProject);
const {srcPath} = require.main.require("config").dirs;
const nodeModules = `${srcPath}/node_modules`;
const fs = require("fs");
const fileExist = fs.existsSync;


describe("Check if example project is downloaded and created", function()
{
  this.timeout(10000);
  it(`${nodeModules} should exists`, (done) =>
  {
    createExampleProject().then(() => {
      console.log("here");
      fileExist(nodeModules).should.equal(true);
      done();
    }).catch(done);
  });
});
