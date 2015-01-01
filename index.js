'use strict';

var fs = require('fs');
var nopt = require("nopt");

var opts = {
  "lib-dir" : String,
  "default-index": String,
  "rev": [String, null],
  "sha": [String, null]
}
var DocTree = require('./addon');

var parsedOptions = nopt(opts);

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

module.exports = {
  name: 'ember-cli-yuidoc-converter',
  treeFor: function(type){
    var defaultIndex = parsedOptions['default-index'];
    var rev = parsedOptions['rev'] || 'master';
    var sha = parsedOptions['sha'] || 'master';

    var yuidocOptions;

    try {
      yuidocOptions = JSON.parse(fs.readFileSync(libDir + '/yuidoc.json', {encoding: 'utf-8'})).options || {};
    } catch(e) {
      yuidocOptions = {};
    }

    yuidocOptions.paths = yuidocOptions.paths || [libDir];

    if (type === 'public') {
      return new DocTree(libDir, defaultIndex, rev, sha, yuidocOptions);
    }
  }
};
