const fs = require("fs");
const path = require("path");
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const frontMatter = require("front-matter");

const {pageDir} = require("../config");

/**
 * Creates sitemap tree from the filePaths array
 * @param  {Object} sitemap   an object for sitemap assingent
 * @param  {Array} filePaths  Array of paths ex.:
 *                            [ 'about.md', 'about/team.md', ...]
 */
let createSitemap = (sitemap, filePaths) =>
{
  for (let filePath of filePaths)
  {
    let {dir, name} = path.parse(filePath);
    let url = "";
    let files = [];

    if (dir)
      files = dir.split("/");

    if (name != "index")
    {
      url = path.join(dir, name)
      files.push(name);
    }
    else if (!dir) // Homepage
    {
      sitemap.file = name;
      assignToNode(filePath, sitemap, path.join(dir));
    }
    else
    {
      url = path.join(dir);
    }

    files.reduce((acc, file, index) => 
    {
      acc = findAddNode(acc, file);

      // Last item
      if (index == files.length - 1)
        assignToNode(filePath, acc, url);

      return acc;
    }, sitemap);
  }
};

/**
 * Find node or creates a new one
 * @param  {Object} node {children [...],
 *                        metadata: {title: "Documentation"}, file: "index"}
 * @param  {String} file name(id) of the child
 */
function findAddNode(node, file)
{
  if (!node.children)
    node.children = [];
  
  let childNode = node.children.find((elem) =>
  {
    if (elem.file == file)
      return elem
  });
  if (!childNode)
  {
    childNode = {file: file};
    node.children.push(childNode);
  }
  return childNode;
}

/**
 * Assignes metadata to the node from the file
 * @param  {String} filePath Path to the file
 * @param  {Object} node     The node that takes the metadata
 * @param  {String} url      Relative URL of the page(without locale)
 */
function assignToNode(filePath, node, url)
{
  readFile(`${pageDir}/${filePath}`, "utf-8").then((data) =>
  {
    let meta = {metadata: frontMatter(data).attributes, url: url};
    Object.assign(node, meta);
  });
}

exports.createSitemap = createSitemap;
