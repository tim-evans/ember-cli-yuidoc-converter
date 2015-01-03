'use strict';

var fs = require('fs');
var nopt = require("nopt");
var url = require("url");
var path = require("path");

var opts = {
  "lib-dir" : path,
  "default-index": String,
  "default-module": String,
  "rev": [String, null],
  "sha": [String, null],
  "github-url": url
}
var DocTree = require('./addon');

var parsedOptions = nopt(opts);

// validate options
var libDir = parsedOptions['lib-dir']
if (!libDir) {
  throw new Error("API builder cli argumemnt --lib-dir=/some/lib/path. It was not set");
}

var stat = fs.lstatSync(libDir);
if (!stat.isDirectory()) {
  throw new Error(
    "API builder excepted cli argumemnt --lib-dir=/some/lib/path to reference a directory. `" +
    libDir +
    "` is not a directory"
  );
}

if (!parsedOptions['default-index']) {
  throw new Error(
    "YUIDoc puts all classes into a big list keyed by name " +
    "Run `yuidoc` in your project and check the resulting `data.json` file's `classes` section. " +
    "Supply the class you'd like to use as the default as a `--default-index` option and run " +
    "this command again: e.g. --default-index=Ember"
  );
}
if (!parsedOptions['default-module']) {
  throw new Error(
    "YUIDoc puts all modules into a big list keyed by name, even if you have just once module. \n"+
    "Run `yuidoc` in your project and check the resulting `data.json` file's `modules` section. " +
    "Supply the module you'd like to use as the default as a `--default-module` option and run " +
    "this command again: e.g. --default-module=ember"
  );
}

if (!parsedOptions['github-url']) {
  throw new Error(
    "Expected a command line argumemnt --github-url. Supply one and run the command again: " +
    "e.g. --github-url=https://github.com/emberjs/ember.js"
  );
}

module.exports = {
  name: 'ember-cli-yuidoc-converter',
  treeFor: function(type){
    if (type === 'public') {

      var defaultIndex = parsedOptions['default-index'];
      var defaultModule = parsedOptions['default-module'];

      var rev = parsedOptions['rev'] || 'master';
      var sha = parsedOptions['sha'] || 'master';

      var githubUrl = parsedOptions['github-url'];

      var yuidocOptions;

      try {
        yuidocOptions = JSON.parse(fs.readFileSync(libDir + '/yuidoc.json', {encoding: 'utf-8'})).options || {};
      } catch(e) {
        yuidocOptions = {};
      }

      yuidocOptions.paths = yuidocOptions.paths || [libDir];
      return new DocTree(libDir, defaultIndex, defaultModule, githubUrl, rev, sha, yuidocOptions);
    }
  }
};
