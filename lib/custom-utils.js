const fs = require('fs');
const path = require('path');
const {promisify} = require('util');

/**
 * Directory walker to get all files recursively
 * @param  {String}   dir  Directory to walk through
 * @param  {Function} done Callback function
 *                         Parameters:
 *                           * Error message
 *                           * Array of Strings
 */
let walker = (dir, callback) =>
{
  let results = [];
  fs.readdir(dir, (err, list) =>
  {
    if (err)
      return callback(err);

    let pending = list.length;
    if (!pending)
      return callback(null, results);

    for (let file of list)
    {
      file = `${dir}/${file}`;
      fs.stat(file, (direrr, stat) =>
      {
        if (stat && stat.isDirectory())
        {
          walker(file, function(err, res)
          {
            results = results.concat(res);
            pending--;
            if (!pending)
              callback(null, results);
          });
        }
        else
        {
          results.push(file);
          pending--;
          if (!pending)
            callback(null, results);
        }
      });
    }
  });
};

/**
 * Walks through multiple dirs
 * @param  {Array}   dirs     Array of directory strings
 * @param  {Function} callback [description]
 *                             Parameters:
 *                               * Error message
 *                               * Array of Strings
 */
let walkDirs = (dirs, callback) =>
{
  let dirWalker = promisify(walker);
  Promise.all(dirs.map((dir) => dirWalker(dir))).then((files) => 
  {
    callback(null, files.reduce((acc, val) => acc.concat(val)));
  }).catch((err) => 
  {
    callback(err);
  });
};



exports.walkDirs = walkDirs;
