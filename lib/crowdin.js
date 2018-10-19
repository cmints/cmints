"use strict";

const {generateSourceJson} = require("../lib/i18n");
const config = require("../config");
const {defaultLocale, crowdinId} = config.i18nOptions;
const {pageDir, localesDir, tempDir} = config.dirs;
const fs = require("fs");
const path = require("path");
const {promisify} = require("util");
const glob = promisify(require("glob").glob);
const {parsePage} = require("../lib/parser");
const request = require("request");
const crowdinApi = "https://crowdin.com/api/project";
const extra = require("fs-extra");
const outputJson = promisify(extra.outputJson);
const remove = promisify(extra.remove);
const copy = promisify(extra.copy);
const outputFile = promisify(extra.outputFile);
const admZip = require("adm-zip");
let query = "key=${projectKey}&json=true";
const tempZip = `${tempDir}.zip`;

let uploadStack = [];

/**
 * Creates ReadStream from the file
 * @param {String} filePath the source file to upload
 */
function prepareUploadData(filePath, dir)
{
  let data = {};
  data["files[" + filePath + "]"] = fs.createReadStream(`${dir}/${filePath}`);
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
    url: `${crowdinApi}/${crowdinId}/add-file?${query}`,
    formData: prepareUploadData(filePath, tempDir)
  }, (err, resp, body) =>
  {
    const response = JSON.parse(body);
    if (response.success)
    {
      removeUploadStack();
      console.log(`Successfully added ${filePath}`);
    }
    else
    {
      handleCrowdinError(response.error.code, filePath);
    }
  });
}

function removeUploadStack(callback)
{
  uploadStack.pop();
  if (!uploadStack.length)
  {
    if (!fs.existsSync(tempDir))
      process.exit();

    remove(tempDir).then(() =>
    {
      console.log("Temporary directory is removed");
      if (callback)
        callback();
      else
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
    url: `${crowdinApi}/${crowdinId}/add-directory?${query}`,
    form: {name: dir}
  }, (err, resp, body) =>
  {
    const response = JSON.parse(body);
    if (response.success)
    {
      console.log(`${dir} - directory is created`);
      console.log(`${filePath} - Upload retry`);
      addFile(filePath);
    }
    else
    {
      handleCrowdinError(response.error.code, filePath);
    }
  });
}

/**
 * Crowdin API response handler
 * @param {String} code of the crowdin API response
 * @param {String} filePath the source file path to upload
 */
function handleCrowdinError(code, filePath)
{
  let {dir} = path.parse(filePath);
  switch (code)
  {
    case 17: // Specified directory was not found
      console.log(`info: Specified directory for ${filePath} was not found`);
      createDir(filePath);
      break;
    case 8: // File was not found
      console.log(`info: File ${filePath} was not found`);
      addFile(filePath);
      break;
    case 50: // Directory already exists
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
 * Remove files from the crowdin
 * @param {Array} files to be removed from the Crowdin
 */
function removeFilesFromCrowdin(files)
{
  const filesStack = files.slice();
  for (const file of files)
  {
    request.post({
      url: `${crowdinApi}/${crowdinId}/delete-file?${query}`,
      form: {file}
    }, (err, resp, body) =>
    {
      const response = JSON.parse(body);
      if (response.success)
      {
        filesStack.pop();
        console.log(`${file} - has been deleted from the Crowdin`);
        if (filesStack.length == 0)
        {
          process.exit();
        }
      }
      else
      {
        console.log("error:", response.error.code);
        process.exit();
      }
    });
  }
}

/**
 * Create JSON files from the source strings and upload them to the Crowdin
 */
function addUpdateSourceFiles()
{
  const crowdinFilesToRemove = [];
  const updateCrowdinSourceFile = (filePath) =>
  {
    console.log(`Updating ${filePath} file`);
    request.post({
      url: `${crowdinApi}/${crowdinId}/update-file?${query}`,
      formData: prepareUploadData(filePath, tempDir)
    }, (err, resp, body) =>
    {
      const response = JSON.parse(body);
      if (response.success)
      {
        console.log(`Successfully Updated ${filePath}`);
        removeUploadStack(() =>
        {
          if (crowdinFilesToRemove.length == 0)
            process.exit();
          else
            removeFilesFromCrowdin(crowdinFilesToRemove);
        });
      }
      else
      {
        handleCrowdinError(response.error.code, filePath);
      }
    });
  };

  const removeItemFromArray = (array, item) =>
  {
    const index = array.indexOf(item);
    if (index !== -1)
      array.splice(index, 1);
  };

  let dirs = [];
  const defaultStatic = `${localesDir}/${defaultLocale}`;
  dirs.push(glob(`${defaultStatic}/**/*.*`, {}));
  dirs.push(glob(`${pageDir}/**/*.*`, {}));
  // https://support.crowdin.com/api/info/
  request(`${crowdinApi}/${crowdinId}/info?${query}`, (err, response, body) =>
  {
    const {success, error, files} = JSON.parse(body);
    if (success === false)
    {
      console.log(`error ${error.code}:`, error.message);
      process.exit();
    }

    Promise.all(dirs).then(([staticFiles, pageFiles]) =>
    {
      uploadStack = [...staticFiles, ...pageFiles];
      const getAllCrowdinStrings = (files, dir = "/") =>
      {
        for (const file of files)
        {
          const {name} = file;
          if (file.node_type == "file")
            crowdinFilesToRemove.push(dir + name);
          else if (file.node_type == "directory")
            getAllCrowdinStrings(file.files, dir + name + "/");
        }
      };
      getAllCrowdinStrings(files);

      // Upload source static files
      copy(`${defaultStatic}`, tempDir).then(() =>
      {
        for (let file of staticFiles)
        {
          file = file.replace(`${defaultStatic}`, "");
          removeItemFromArray(crowdinFilesToRemove, file);
          updateCrowdinSourceFile(file);
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
          return outputJson(`${tempDir}/${filePath}`, result, {spaces: 2});
        }).then(() =>
        {
          removeItemFromArray(crowdinFilesToRemove, filePath);
          updateCrowdinSourceFile(filePath);
        }).catch(err =>
        {
          console.error(err);
        });
      }
    });
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
      filePath = path.relative(localesDir, filePath);
      let [locale, ...rest] = filePath.split(path.sep);
      // Skip source translations
      if (locale == defaultLocale)
        continue;

      uploadStack.push(filePath);
      filePath = path.join(...rest);
      let data = prepareUploadData(filePath, `${localesDir}/${locale}`);
      data.language = locale;
      request.post({
        url: `${crowdinApi}/${crowdinId}/upload-translation?${query}`,
        formData: data
      }, (err, resp, body) =>
      {
        const response = JSON.parse(body);
        if (response.success)
        {
          console.log(`Successfully Updated ${filePath}`);
          removeUploadStack();
        }
        else
        {
          removeUploadStack();
          console.error(`Error: Error num ${response.error.code} for ${filePath}
          - see https://support.crowdin.com/api/error-codes/`);
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
  console.log("Downloading translations");
  request(`${crowdinApi}/${crowdinId}/download/all.zip?${query}`)
    .pipe(fs.createWriteStream(tempZip))
    .on("close", () =>
    {
      console.log("Translations are downloaded");
      const zip = new admZip(tempZip);
      const zipEntries = zip.getEntries();
      const writeFilePromises = [];
      for (const zipEntry of zipEntries)
      {
        const {entryName} = zipEntry;
        const notTranslated = zip.readAsText(entryName).startsWith("[");
        if (zipEntry.isDirectory || notTranslated)
          continue;

        console.log(`${entryName} is being processed`);
        const target = path.join(localesDir, entryName);
        writeFilePromises.push(outputFile(target, zipEntry.getData()));
      }

      Promise.all(writeFilePromises).then(() =>
      {
        console.log("Translations are extracted");
        console.log("Removing downloaded zip file..");
        return remove(tempZip);
      }).then(process.exit);
    });
}

function prerequisiteCheck(crowdinKey)
{
  const crowdinDocumentation = "https://cmints.io/en/documentation/i18n/crowdin";
  let errorMsg = "";
  if (!crowdinKey)
  {
    errorMsg = `Crowdin key is missing, see -> ${crowdinDocumentation}`;
  }
  else if (!crowdinId)
  {
    errorMsg = `crowdinId is missing, see -> ${crowdinDocumentation}`;
  }

  if (errorMsg)
  {
    console.error(errorMsg);
    process.exit();
  }
}

const runCrowdinSync = (argv) =>
{
  const crowdinKey = argv.key;
  prerequisiteCheck(crowdinKey);
  query = query.replace("${projectKey}", crowdinKey);
  switch (argv.crowdin)
  {
    case "update-sources":
      addUpdateSourceFiles();
      break;
    case "get-translations":
      request(`${crowdinApi}/${crowdinId}/export?${query}`, (error, response, body) =>
      {
        if (error)
        {
          console.error("error:", error);
          process.exit();
        }
        else
        {
          console.log(`Project build has been ${JSON.parse(body).success.status}`);
          downloadTranslations();
        }
      });
      break;
    case "update-translations":
      uploadTranslations();
      break;
  }
};

module.exports = {runCrowdinSync};
