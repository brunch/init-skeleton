'use strict';
var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var sysPath = require('path');
var rimraf = require('rimraf');
var ncp = require('ncp');
var os = require('os');
var crypto = require('crypto');

var skeletons = require('./skeletons.json');
var logger = console;
var commandName = 'init-skeleton';

var genBanner = function(skeletons, slice) {
  var cmd = slice ? commandName + ' ' : '';
  return Object.keys(skeletons).slice(0, slice).reduce(function(str, key) {
    var arr = skeletons[key];
    var link, text;
    if (Array.isArray(arr)) {
      link = arr[0];
      text = arr[1];
    } else {
      link = '';
      text = arr;
    }
    return str + '* ' + cmd + key + ' — ' + text + '\n';
  }, '');
};

// Shortcut for backwards-compat fs.exists.
var fsexists = fs.exists || sysPath.exists;

// Executes `npm install` and `bower install` in rootPath.
//
// rootPath - String. Path to directory in which command will be executed.
// callback - Function. Takes stderr and stdout of executed process.
//
// Returns nothing.
var install = function(rootPath, callback) {
  var prevDir = process.cwd();
  logger.log('Installing packages...');
  process.chdir(rootPath);
  fsexists('bower.json', function(exists) {
    var installCmd = 'npm install';
    if (exists) installCmd += ' & bower install';
    exec(installCmd, function(error, stdout, stderr) {
      var log;
      process.chdir(prevDir);
      if (stdout) console.log(stdout.toString());
      if (error != null) {
        log = stderr.toString();
        var bowerNotFound = /bower\: command not found/.test(log);
        var msg = bowerNotFound ? 'You need to install Bower and then install skeleton dependencies: `npm install -g bower && bower install`. Error text: ' + log : log;
        return callback(new Error(msg));
      }
      callback(null, stdout);
    });
  });
};

var ignored = function(path) {
  return !(/^\.(git|hg)$/.test(sysPath.basename(path)));
};

// Copy skeleton from file system.
//
// skeletonPath   - String, file system path from which files will be taken.
// rootPath     - String, directory to which skeleton files will be copied.
// callback     - Function.
//
// Returns nothing.
var copy = function(skeletonPath, rootPath, callback) {
  var copyDirectory = function() {
    ncp(skeletonPath, rootPath, {filter: ignored, stopOnErr: true}, function(error) {
      if (error != null) return callback(new Error(error));
      logger.log('Created skeleton directory layout');
      install(rootPath, callback);
    });
  };

  // Chmod with 755.
  mkdirp(rootPath, 0x1ed, function(error) {
    if (error != null) return callback(new Error(error));
    fsexists(skeletonPath, function(exists) {
      if (!exists) {
        var error = "skeleton '" + skeletonPath + "' doesn't exist";
        return callback(new Error(error));
      }
      logger.log('Copying local skeleton to "' + rootPath + '"...');

      copyDirectory();
    });
  });
};

var re = {
  github: /(gh|github)\:(?:\/\/)?/,
  slash: /^[-\w]+\/[-\w]+$/
};

var cleanURL = function(address) {
  if (re.slash.test(address)) return "git://github.com/" + address + ".git";
  if (re.github.test(address)) {
    var res = address.replace(re.github, '');
    return "git://github.com/" + res + ".git";
  }
  return address;
};

var sha1Digest = function(string) {
  var shasum = crypto.createHash('sha1');
  shasum.update(string);
  return shasum.digest('hex');
};

// Clones skeleton from URI.
//
// address     - String, URI. https:, github: or git: may be used.
// rootPath    - String, directory to which skeleton files will be copied.
// callback    - Function.
//
// Returns nothing.
var clone = function(address, rootPath, callback) {
  var url = cleanURL(address);
  var cacheDir = sysPath.join(os.homedir(), '.brunch', 'cache');
  var repoHash = sha1Digest(url);
  var repoDir = sysPath.join(cacheDir, repoHash);

  var copyCached = function() {
    ncp(repoDir, rootPath, function() {
      rimraf(sysPath.join(rootPath, '.git'), function(error) {
        if (error != null) {
          logger.error("Git dir removal error: " + error.toString());
        }

        logger.log('Created skeleton directory layout');
        install(rootPath, callback);
      });
    });
  };

  mkdirp(cacheDir, function(error) {
    if (error != null) {
      return callback(new Error("Mkdir error: " + e.toString()));
    }

    fsexists(repoDir, function(exists) {
      console.log(exists);
      if (exists) {
        logger.log('Pulling recent changes from git repo "' + url + '" to "' + repoDir + '"...');

        var cmd = 'git pull origin master';
        exec(cmd, { cwd: repoDir }, function(error, stdout, stderr) {
          if (error != null) {
            logger.log('Could not pull, using cached version (' + error.toString() + ')');
          } else {
            logger.log('Pulled master into "' + repoDir + '"');
          }

          copyCached();
        });
      } else {
        logger.log('Cloning git repo "' + url + '" to "' + repoDir + '"...');

        var cmd = 'git clone ' + url + ' ' + repoDir;
        exec(cmd, function(error, stdout, stderr) {
          if (error != null) {
            return callback(new Error("Git clone error: " + stderr.toString()));
          }

          logger.log('Cloned "' + url + '" into "' + repoDir + '"');
          copyCached();
        });
      }
    });
  });
};

// Main function that clones or copies the skeleton.
//
// skeleton    - String, file system path or URI of skeleton.
// rootPath    - String, directory to which skeleton files will be copied.
// callback    - Function.
//
// Returns nothing.
var initSkeleton = function(skeleton, options, callback) {
  var cwd = process.cwd();

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  if (options == null) options = {};
  var rootPath = options.rootPath || cwd;
  if (options.commandName) commandName = options.commandName;
  if (options.logger) logger = options.logger;

  if (skeleton === '.' && rootPath === cwd) skeleton = null;
  if (callback == null) callback = function(error) {
    if (error != null) return logger.error(error.toString());
  };

  var banner, error;
  if (skeleton == null) {
    banner = fs.readFileSync(sysPath.join(__dirname, 'banner.txt'), 'utf8');
    error = banner
      .replace(/\{\{command\}\}/g, commandName)
      .replace(/\{\{suggestions\}\}/g, genBanner(skeletons, 8));
    return callback(new Error(error));
  }

  skeleton = skeletons[skeleton] || skeleton;
  if (Array.isArray(skeleton)) skeleton = skeleton[0];

  var uriRe = /(?:https?|git(hub)?|gh)(?::\/\/|@)?/;
  fsexists(sysPath.join(rootPath, 'package.json'), function(exists) {
    if (exists) {
      return callback(new Error("Directory '" + rootPath + "' is already an npm project"));
    }
    var isGitUri = skeleton && uriRe.test(skeleton);
    var get = isGitUri ? clone : copy;
    get(skeleton, rootPath, callback);
  });
};

exports.init = initSkeleton;
exports.printBanner = function(commandName) {
  initSkeleton(null, {commandName: commandName}, (error) => {
    console.log(error.message);
  });
}
exports.cleanURL = cleanURL;
