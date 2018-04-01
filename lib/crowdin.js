const {defaultLocale, generateSourceJson} = require("../lib/i18n");
const {pageDir, localesDir} = require("../config");
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
const copy = promisify(extra.copy);
const tmpDir = "./tmp";
const admZip = require('adm-zip');

let projectKey = null;
let uploadStack = [];

/**
 * Creates ReadStream from the file
 * @param {String} filePath the source file to upload
 */
function prepareUploadData(filePath, dir)
{
  let data = {};
  data['files[' + filePath + ']'] = fs.createReadStream(`${dir}/${filePath}`);
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
    formData: prepareUploadData(filePath, tmpDir)
  }, (err, resp, body) =>
  {
    let code = getCode(body);
    if (!code)
    {
      removeUploadStack();
      console.log(`Successfully added ${filePath}`);
      return;
    }

    onAddUploadResponse(code[1], filePath);
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
    formData: prepareUploadData(filePath, tmpDir)
  }, (err, resp, body) =>
  {
    let code = getCode(body);
    if (!code)
    {
      removeUploadStack();
      console.log(`Successfully Updated ${filePath}`);
      return;
    }

    onAddUploadResponse(code[1], filePath);
  });
}

function removeUploadStack()
{
  uploadStack.pop();
  if (!uploadStack.length)
  {
    if (!fs.existsSync(tmpDir))
      process.exit();

    remove(tmpDir).then(() =>
    {
      console.log("Temporary directory is removed");
      process.exit();
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
    onAddUploadResponse(code[1], filePath);
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
function onAddUploadResponse(code, filePath)
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
  let dirs = [];
  const defaultStatic = `${localesDir}/${defaultLocale}`;
  dirs.push(glob(`${defaultStatic}/**/*.*`, {}));
  dirs.push(glob(`${pageDir}/**/*.*`, {}));
  Promise.all(dirs).then(([staticFiles, pageFiles]) =>
  {
    uploadStack = [...staticFiles, ...pageFiles];

    // Upload source static files
    copy(`${defaultStatic}`, tmpDir).then(()=>
    {
      for (let file of staticFiles)
      {
        file = file.replace(`${defaultStatic}`, "");
        updateFile(file);
      }
    }).catch(err =>
    {
      console.error(err);
    });

    // Generate source files from the pages
    for (let file of pageFiles)
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
        console.error(err);
      });
    }
  });
}

/**
 * Upload locale translations to the crowdin
 */
function uploadTranslations()
{
  glob(`${localesDir}/**/*.*`, {}).then((files) =>
  {
    for (let filePath of files)
    {
      filePath = filePath.replace(localesDir, "");
      let [locale, ...rest] = filePath.split("/").slice(1);
      // Skip source translations
      if (locale == defaultLocale)
        continue;

      uploadStack.push(filePath);
      filePath = path.join(...rest);
      let data = prepareUploadData(filePath, `${localesDir}/${locale}`);
      data.language = locale;
      request.post({
        url: `${crowdinApi}/${projectId}/upload-translation?key=${projectKey}`,
        formData: data
      }, (err, resp, body) =>
      {
        let code = getCode(body);
        if (!code)
        {
          console.log(`Successfully Updated ${filePath}`);
          removeUploadStack();
          return;
        }
        else
        {
          removeUploadStack();
          console.error(`Error: Error num ${code} for ${filePath} - see 
            https://support.crowdin.com/api/error-codes/`);
        }
      });
    }
  });
}

/**
 * Download translaion files and extract to locales folder
 */
function downloadTranslations()
{
  const zipFile = "./tmp.zip";
  request(`${crowdinApi}/${projectId}/download/all.zip?key=${projectKey}`)
  .pipe(fs.createWriteStream("tmp.zip"))
  .on('close', () => 
  {
    const zip = new admZip(zipFile);
    const zipEntries = zip.getEntries();
    for (const zipEntry of zipEntries)
    {
      const filePath = zipEntry.entryName;
      const isTranslated = zip.readAsText(filePath).startsWith("[");
      if (filePath.slice(-5) != ".json" || isTranslated)
        continue;
  
      const destinationDir = `${localesDir}/${path.parse(filePath).dir}`;
      zip.extractEntryTo(filePath, destinationDir, false, true);
      console.log(`${zipEntry.entryName} is extracted`);
    }
 
    console.log("Translations are downloaded");
    remove(zipFile).then(() =>
    {
      process.exit();
    });
  });
}

const runCrowdinSync = (argv) =>
{
  projectKey = argv.key;
  switch (argv.crowdin)
  {
    case "update-sources":
      addUpdateSourceFiles();
      break;
    case "get-translations":
      downloadTranslations();
      break;
    case "update-translations":
      uploadTranslations();
      break;
  }
};

exports.runCrowdinSync = runCrowdinSync;
