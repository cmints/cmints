"use strict";

const {promisify} = require("util");
const exec = promisify(require("child_process").exec);
const {execSync} = require("child_process");
const {deployment, dirs} = require("../config");
const {contentDir} = dirs;
const path = require("path");

/**
 * Deploy project to various services
 * @param {String} where deployment destination name (ex.: gh-pages)
 */
const deploy = () =>
{
  if (deployment.where == "gh-pages")
  {
    const gitDir = `--git-dir=${path.join(deployment.gitDir, ".git")}`;
    const commitMsg = '"Initial subtree commit"';
    let currentBranch = "";
    const {pid} = process;

    const cleanUp = () =>
    {
      execSync(`git ${gitDir} checkout ${currentBranch}`);
      execSync(`git ${gitDir} branch -D ${pid}`);
      console.log(`Returned to ${currentBranch} and removed ${pid} branch`);
    };

    exec("git rev-parse --abbrev-ref HEAD").then((branchName) => {
      currentBranch = branchName.stdout;
      return exec(`git ${gitDir} checkout -b ${pid}`);
    }).then(() =>
    {
      console.log(`Checked out the ${pid} branch`);
      return exec(`git ${gitDir} add ${contentDir} --force`);
    }).then(() =>
    {
      console.log(`Added ${contentDir}`);
      return exec(`git --git-dir=src/.git commit -m ${commitMsg}`);
    }).then(() =>
    {
      console.log("Commited the changes");
      console.log("Pushing changes to Github Pages");
      // see -> https://stackoverflow.com/questions/12644855/how-do-i-reset-a-heroku-git-repository-to-its-initial-state/13403588#13403588
      return exec(`git ${gitDir} push --force origin \`git ${gitDir} subtree split --prefix ${contentDir} ${pid}\`:refs/heads/gh-pages`);
    }).then(() =>
    {
      console.log("Pushed changes to the gh-pages branch");
      cleanUp();
      console.log("The project is deloyed to the Github Pages");
      process.exit();
    }).catch((err) =>
    {
      console.log(err.message);
      cleanUp();
      process.exit();
    });
  }
};

module.exports = {deploy};
