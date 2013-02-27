'use strict';
var debug = require('debug')('init-recipe');
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
  if (callback == null) {
    callback = (function() {});
  }
  var prevDir = process.cwd();
  logger.info('Installing packages...');
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


// Copy recipe from file system.
//
// recipePath - String, file system path from which files will be taken.
// rootPath     - String, directory to which recipe files will be copied.
// callback     - Function.
//
// Returns nothing.
var copyRecipe = function(recipePath, rootPath, callback) {
  debug('Copying recipe from ' + recipePath);
  var copyDirectory = function(from) {
    fs_utils.copyIfExists(from, rootPath, false, function(error) {
      if (error != null) {
        return logger.error(error);
      }
      logger.info('Created recipe directory layout');
      install(rootPath, callback);
    });
  };

  // Chmod with 755.
  mkdirp(rootPath, 0x1ed, function(error) {
    if (error != null) {return logger.error(error);}
    fs.exists(recipePath, function(exists) {
      if (!exists) {
        return logger.error("Recipe '" + recipePath + "' doesn't exist");
      }
      copyDirectory(recipePath);
    });
  });
};

// Clones recipe from URI.
//
// address     - String, URI. https:, github: or git: may be used.
// rootPath    - String, directory to which recipe files will be copied.
// callback    - Function.
//
// Returns nothing.
var cloneRecipe = function(address, rootPath, callback) {
  var gitHubRe = /(gh|github)\:(?:\/\/)?/;
  var url = gitHubRe.test(address) ?
    ("git://github.com/" + address.replace(gitHubRe, '') + ".git") : address;
  debug("Cloning recipe from git URL " + url);
  exec("git clone " + url + " " + rootPath, function(error, stdout, stderr) {
    if (error != null) {
      return logger.error("Git clone error: " + stderr.toString());
    }
    logger.info('Created recipe directory layout');
    rimraf(sysPath.join(rootPath, '.git'), function(error) {
      if (error != null) {
        return logger.error(error);
      }
      install(rootPath, callback);
    });
  });
};

var initRecipe = function(recipe, rootPath, callback) {
  if (rootPath == null) rootPath = process.cwd();
  if (callback == null) callback = function() {};

  var uriRe = /(?:https?|git(hub)?|gh)(?::\/\/|@)?/;
  fs.exists(sysPath.join(rootPath, 'package.json'), function(exists) {
    var get, isGitUri;
    if (exists) {
      return logger.error("Directory '" + rootPath + "' is already an npm project");
    }
    isGitUri = recipe && uriRe.test(recipe);
    get = isGitUri ? cloneRecipe : copyRecipe;
    get(recipe, rootPath, callback);
  });
};

exports.initRecipe = initRecipe;
