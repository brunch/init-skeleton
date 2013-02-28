'use strict';
var debug = require('debug')('init-skeleton');
var exec = require('child_process').exec;
var fs = require('fs');
var logger = require('loggy');
var mkdirp = require('mkdirp');
var sysPath = require('path');
var rimraf = require('rimraf');
var utils = require('./utils');

// Executes `npm install` in rootPath.
//
// rootPath - String. Path to directory in which command will be executed.
// callback - Function. Takes stderr and stdout of executed process.
//
// Returns nothing.
var install = function(rootPath, callback) {
  if (callback == null) callback = function() {};
  var prevDir = process.cwd();
  logger.log('Installing packages...');
  process.chdir(rootPath);
  exec('npm install', function(error, stdout, stderr) {
    var log;
    process.chdir(prevDir);
    if (error != null) {
      log = stderr.toString();
      logger.error(log);
      return callback(log);
    }
    callback(null, stdout);
  });
};


// Copy skeleton from file system.
//
// skeletonPath   - String, file system path from which files will be taken.
// rootPath     - String, directory to which skeleton files will be copied.
// callback     - Function.
//
// Returns nothing.
var copy = function(skeletonPath, rootPath, callback) {
  debug('Copying skeleton from ' + skeletonPath);
  var copyDirectory = function(from) {
    fs_utils.copyIfExists(from, rootPath, false, function(error) {
      if (error != null) return logger.error(error);
      logger.log('Created skeleton directory layout');
      install(rootPath, callback);
    });
  };

  // Chmod with 755.
  mkdirp(rootPath, 0x1ed, function(error) {
    if (error != null) {return logger.error(error);}
    fs.exists(skeletonPath, function(exists) {
      if (!exists) {
        return logger.error("skeleton '" + skeletonPath + "' doesn't exist");
      }
      copyDirectory(skeletonPath);
    });
  });
};

// Clones skeleton from URI.
//
// address     - String, URI. https:, github: or git: may be used.
// rootPath    - String, directory to which skeleton files will be copied.
// callback    - Function.
//
// Returns nothing.
var clone = function(address, rootPath, callback) {
  var gitHubRe = /(gh|github)\:(?:\/\/)?/;
  var url = gitHubRe.test(address) ?
    ("git://github.com/" + address.replace(gitHubRe, '') + ".git") : address;
  debug("Cloning skeleton from git URL " + url);
  exec("git clone " + url + " " + rootPath, function(error, stdout, stderr) {
    if (error != null) {
      return logger.error("Git clone error: " + stderr.toString());
    }
    logger.log('Created skeleton directory layout');
    rimraf(sysPath.join(rootPath, '.git'), function(error) {
      if (error != null) {
        return logger.error(error);
      }
      install(rootPath, callback);
    });
  });
};

// Main function that clones or copies the skeleton.
//
// skeleton      - String, file system path or URI of skeleton.
// rootPath    - String, directory to which skeleton files will be copied.
// callback    - Function.
//
// Returns nothing.
var initskeleton = function(skeleton, rootPath, callback) {
  if (rootPath == null) rootPath = process.cwd();
  if (callback == null) callback = function() {};
  if (typeof rootPath === 'function') {
    callback = rootPath;
    rootPath = process.cwd();
  }

  var uriRe = /(?:https?|git(hub)?|gh)(?::\/\/|@)?/;
  fs.exists(sysPath.join(rootPath, 'package.json'), function(exists) {
    if (exists) {
      return logger.error("Directory '" + rootPath + "' is already an npm project");
    }
    var isGitUri = skeleton && uriRe.test(skeleton);
    var get = isGitUri ? clone : copy;
    get(skeleton, rootPath, callback);
  });
};

module.exports = initskeleton;
