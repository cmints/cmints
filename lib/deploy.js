"use strict";

const {execSync} = require("child_process");
const {contentDir, srcPath} = require("../config").dirs;
const path = require("path");

/**
 * Deploy project to various services
 * @param {String} where deployment destination name (ex.: gh-pages)
 */
const deploy = (where) =>
{
  if (where == "gh-pages")
  {
    const gitDir = `--git-dir=${path.join(srcPath, ".git")}`;
    const commitMsg = '"Initial subtree commit"';

    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD");
    execSync(`git ${gitDir} checkout -B gh-pages`);
    execSync(`git ${gitDir} add ${contentDir} --force && git --git-dir=src/.git commit -m ${commitMsg}`);
    execSync(`git ${gitDir} subtree push --prefix ${contentDir} origin gh-pages`);
    execSync(`git ${gitDir} checkout ${currentBranch}`);

    process.exit();
  }
};

module.exports = {deploy};
