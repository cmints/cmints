const fs = require("fs");
const path = require("path");
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const frontMatter = require("front-matter");
const glob = promisify(require("glob").glob);

const {pageDir} = require("../config");

let sitemap = {};

/**
 * Initialize sitemap creation from the page files and updated after changes
 * in page dierectory
 */
let initSitemap = () =>
{
  createSitemap();
  glob(`${pageDir}/**/`, {}).then((folders) =>
  {
    for (let folder of folders)
    {
      fs.watch(folder, {}, () =>
      {
        createSitemap();
      });
    }
  });
};

/**
 * Creates sitemap tree from the files in page directory
 */
function createSitemap()
{
  sitemap = {};
  glob(`${pageDir}/**/*.*`, {}).then((filePaths) =>
  {
    filePaths = filePaths.map((filePath) => filePath.replace(`${pageDir}/`, ""));
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
  });
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

/**
 * Searches node in the sitemap
 * @param  {Object} node Node of the sitemap
 * @param  {String} url  URL of the node
 * @return {Object}      Node object
 */
function getNodeByUrl(node, url)
{
  if (node.url == url)
      return node;
  else if (node.children)
  {
    let result = null;
    for (let childNode of node.children)
      if (result == null)
        result = getNodeByUrl(childNode, url);

    return result;
  }
  return null
}

/**
 * Get Sitemap or sitemap Node
 * @param  {String} url if specified, searches for the node(Optional)
 * @return {Object}     Sitemap or Node Object
 */
let getSitemap = (url) =>
{
  if (url)
    return getNodeByUrl(sitemap, url);
  else
    return sitemap;
};

exports.initSitemap = initSitemap;
exports.getSitemap = getSitemap;
