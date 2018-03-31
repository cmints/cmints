const {defaultLocale, generateSourceJson} = require("../lib/i18n");
const {pageDir} = require("../config");
const fs = require("fs");
const path = require("path");
const {promisify} = require('util');
const glob = promisify(require("glob").glob);
const {parsePage} = require("../lib/parser");
const request = require("request");
const projectId = "cmints-website";
const crowdinApi = "https://crowdin.com/api/project";
const extra = require('fs-extra');
const outputJson = promisify(extra.outputJson);
const remove = promisify(extra.remove);
const tmpDir = "./tmp";
let addUploadStack = [];

/**
 * Creates ReadStream from the file
 * @param {String} filePath the source file to upload
 */
function prepareUploadData(filePath)
{
  let data = {};
  data['files[' + filePath + ']'] = fs.createReadStream(`./tmp/${filePath}`);
  return data;
}

/**
 * Add file to the crowdin project
 * @param {String} filePath the source file to upload
 */
function addFile(filePath)
{
  console.log(`Adding ${filePath} file`);
  request.post({
    url: `${crowdinApi}/${projectId}/add-file?key=${projectKey}`,
    formData: prepareUploadData(filePath)
  }, (err, resp, body) =>
  {
    let code = getCode(body);
    if (!code)
    {
      removeUploadStack();
      console.log(`Successfully added ${filePath}`);
      return;
    }

    onResponse(code[1], filePath);
  });
}

/**
 * Update existing file in the crowdin project
 * @param {String} filePath the source file path to upload
 */
function updateFile(filePath)
{
  console.log(`Updating ${filePath} file`);
  request.post({
    url: `${crowdinApi}/${projectId}/update-file?key=${projectKey}`,
    formData: prepareUploadData(filePath)
  }, (err, resp, body) =>
  {
    let code = getCode(body);
    if (!code)
    {
      removeUploadStack();
      console.log(`Successfully Updated ${filePath}`);
      return;
    }

    onResponse(code[1], filePath);
  });
}

function removeUploadStack()
{
  addUploadStack.pop();
  if (!addUploadStack.length)
  {
    remove(tmpDir).then(() =>
    {
      console.log("Temporary directory is removed");
    });
  }
}

/**
 * Create a directory in the crowdin project
 * @param {String} filePath the source file path to upload
 */
function createDir(filePath)
{
  let {dir} = path.parse(filePath);
  console.log(`Creating ${dir} directory`);
  request.post({
    url: `${crowdinApi}/${projectId}/add-directory?key=${projectKey}`,
    form: {name: dir}
  }, (err, resp, body) =>
  {
    let code = getCode(body);
    if (!code)
    {
      console.log(`${dir} - directory is created`);
      console.log(`${filePath} - Upload retry`);
      addFile(filePath);
      return;
    }
    onResponse(code[1], filePath);
  });
}

/**
 * Get's the response code from the crowdin api call response
 * @param {String} body the response from the crowdin server
 */
function getCode(body)
{
  return /<code>([\d]+)<\/code>/.exec(body);
}

/**
 * Crowdin API response handler
 * @param {String} code of the crowdin API response
 * @param {String} filePath the source file path to upload
 */
function onResponse(code, filePath)
{
  let {dir} = path.parse(filePath);
  switch(code)
  {
    case "17": // Specified directory was not found
      console.log(`info: Specified directory for ${filePath} was not found`);
      createDir(filePath);
      break;
    case "8": // File was not found
      console.log(`info: File ${filePath} was not found`);
      addFile(filePath);
      break;
    case "50": // Directory already exists
      console.log(`info: Directory ${dir} already exist`);
      addFile(filePath);
      break;
    default:
      console.error(`Error: Error num ${code} for ${filePath} - see 
        https://support.crowdin.com/api/error-codes/`);
      break;
  }
}

/**
 * Create JSON files from the source strings and upload them to the Crowdin
 */
function addUpdateSourceFiles()
{
  glob(`${pageDir}/**/*.*`, {}).then((files) =>
  {
    addUploadStack = files;
    for (let file of files)
    {
      let {dir, name, ext} = path.parse(file);
      dir = dir.replace(pageDir, "");
      let filePath = `${dir}/${name}.json`;
      parsePage(`${dir}/${name}`, ext, defaultLocale).then((html) =>
      {
        let result = generateSourceJson(html);
        // Create a temp directory with the source strings
        return outputJson(`${tmpDir}/${filePath}`, result, {spaces: 2});
      }).then(() =>
      {
        updateFile(filePath);
      }).catch(err =>
      {
        console.log(err);
      });
    }
  });
}

addUpdateSourceFiles();
