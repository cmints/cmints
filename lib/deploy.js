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
  if (deployment.where == "git")
  {
    const {branch} = deployment;
    const {gitDir} = deployment;
    const gitDirCmd = `--git-dir=${path.join(gitDir, ".git")}`;
    const commitMsg = '"Initial subtree commit"';
    let currentBranch = "";
    const {pid} = process;
    const gitContentDir = path.relative("", contentDir);

    const cleanUp = () =>
    {
      const checkoutBranch = `git ${gitDirCmd} checkout ${currentBranch}`;
      console.log(`Checkout out previous branch: ${checkoutBranch}`);
      execSync(checkoutBranch);
      const cleanBranch = `git ${gitDirCmd} branch -D ${pid}`;
      console.log(`Remove the temp branch: ${cleanBranch}`);
      execSync(cleanBranch);
    };

    const getCurrentBranchName = `git ${gitDirCmd} rev-parse --abbrev-ref HEAD`;
    console.log(getCurrentBranchName);
    exec(getCurrentBranchName).then((branchName) => {
      currentBranch = branchName.stdout.trim();
      const checkoutNewBranch = `git ${gitDirCmd} checkout -b ${pid}`;
      console.log(`Checkout new branch: ${checkoutNewBranch}`);
      return exec(checkoutNewBranch);
    }).then(() =>
    {
      const addContentDir = `git ${gitDirCmd} add ${gitContentDir} --force`;
      console.log(`Add content dir: ${addContentDir}`);
      return exec(addContentDir);
    }).then(() =>
    {
      const commitChanges = `git ${gitDirCmd} commit -m ${commitMsg}`;
      console.log(`Commiting the changes: ${commitChanges}`);
      return exec(commitChanges);
    }).then(() =>
    {
      const subtreeSplit = `git ${gitDirCmd} subtree split --prefix ${gitContentDir} ${pid}`;
      console.log(`Spliting subtree: ${subtreeSplit}`);
      return exec(subtreeSplit);
    }).then((result) => {
      // see -> https://stackoverflow.com/questions/12644855/how-do-i-reset-a-heroku-git-repository-to-its-initial-state/13403588#13403588
      const pushToPages = `git ${gitDirCmd} push --force origin ${result.stdout.trim()}:refs/heads/gh-pages`;
      console.log(`Pushing content to the ${branch} branch: ${pushToPages}`);
      return exec(pushToPages);
    }).then(() =>
    {
      console.log("Pushed changes to the gh-pages branch, cleaning up...");
      cleanUp();
      console.log("Ready");
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
