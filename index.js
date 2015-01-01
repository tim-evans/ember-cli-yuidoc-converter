'use strict';

var fs = require('fs');
var DocTree = require('./addon');

var libDir = process.env.YUIDOC_LIB_DIR;
if (!libDir) {
  throw new Error("API builder excepted environment variable YUIDOC_LIB_DIR. It was not set");
}

var stat = fs.lstatSync(libDir);
if (!stat.isDirectory()) {
  throw new Error(
    "API builder excepted environment variable YUIDOC_LIB_DIR to reference a directory. `" +
    libDir +
    "` is not a directory"
  );
}

console.log("Reading docs from", libDir);

module.exports = {
  name: 'ember-cli-yuidoc-converter',
  treeFor: function(type){
    var yuidocOptions;

    try {
      yuidocOptions = JSON.parse(fs.readFileSync(libDir + '/yuidoc.json', {encoding: 'utf-8'})).options || {};
    } catch(e) {
      yuidocOptions = {};
    }

    yuidocOptions.paths = yuidocOptions.paths || [libDir];

    if (type === 'public') {
      return new DocTree(libDir, yuidocOptions);
    }
  }
};
