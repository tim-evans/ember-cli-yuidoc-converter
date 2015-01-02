var fs = require('fs');
var quickTemp = require('quick-temp');
var Y = require('yuidocjs');
var markdown = require('./lib/markdown');
var eachValue = require('./lib/utils').eachValue;
var toJSON = require('./lib/utils').toJSON;
var DataBrowser = require('./lib/data-traversal');

function Tree(libDir, defaultIndex, rev, sha, options) {
  this.libDir = libDir;
  this.defaultIndex = defaultIndex;
  this.rev = rev;
  this.sha = sha;

  this.options = options;
  this.options.writeJSON = false;
}

var tmpName = '__docs_tmp__';

Tree.prototype = {
  read: function(){

    // create a temporay dir for writing. The Broccoli API
    // expects us to return this dir. It represents the app's
    // public folder.
    var tmp = quickTemp.makeOrRemake(this, tmpName);

    // create `docs` subdirectory
    var docsDir = tmp + "/docs";
    fs.mkdirSync(docsDir);


    // I kid you not: YUIDoc expects to be in the same directory
    // as the library.
    var cwd = process.cwd();
    process.chdir(this.libDir);

    // parse the library using YUIDoc, but do not write any files
    var parsedDocs = (new Y.YUIDoc(this.options)).run();

    // YUIDoc pasing done, go back to our original working directory
    process.chdir(cwd);


    // Preprocess all the markdown for classes, methods, properties, and events.
    //
    // This saves the cost of rendering to HTML on the client. In the application,
    // these properties are all triple stached - {{{ description }}}.
    parsedDocs.classitems.forEach(function(item){
      item.description = markdown(item.description || '');
    });

    eachValue(parsedDocs.classes, function(klass){
      klass.description = markdown(klass.description || '');
    });


    // generate a data browsing object to travesre relationships,
    // caching lookup as it goes.
    var dataBrowser = DataBrowser(parsedDocs);

    /*
      The data object for the application itself:
      {
        modules: [{name: '...'}],
        namepsaces: [{name: '...'}],
        classes:  [{name: '...'}]
      }

      These are all sorted alphabetically.
    */

    var sortByNameProperty = require('./lib/utils').sortByNameProperty;
    var appJSON = {
      defaultIndex: this.defaultIndex,
      namespaces: [],
      classes: []
    };

    /* Pull each submodule object from the YUIDoc output. It's in the format

        {
          submodules: {
            "A.Name": 1
            "A.AnotherName": 1
          }
        }

        and needs to be an array of
        [{name: 'A.Name'}, {name: 'A.Other'}]
    */
    appJSON.modules = Object.keys(parsedDocs.modules.ember.submodules).map(function(submodule){
      return {name: submodule};
    }).sort(sortByNameProperty);

    /*
      Split "classes" into "classes" and "namespaces".
      In Ember's docs namespaces are denoted as being "static classes"
    */
    eachValue(parsedDocs.classes, function(klass){
      if (klass.static) {
        appJSON.namespaces.push({name: klass.name})
      } else {
        appJSON.classes.push({name: klass.name})
      }
    });

    appJSON.namespaces.sort(sortByNameProperty);
    appJSON.classes.sort(sortByNameProperty);


    /*
      Write the file used for the sidebar navigation:

        s3-bucket/
          1.x.x/
            index.json

      ```index.json
        {
          namespaces: [{name: 'Ember.Somenamespcce'}, ...],
          modules: [{name: 'some-module'}, ...],
          classes: [{name: 'Ember.SomeClass'}, ...]
        }
      ```
    */
    fs.writeFileSync(docsDir + '/index.json', toJSON(appJSON));

    // write out the files for each Class
    /*
      Write the files for each class:
        s3-bucket/
          1.x.x/
            Ember.SomeClass.json
            Ember.SomeClass/
              index.json
              methods.json
              properties.json
              events.json
    */
    var typePlurals = {
      'method': 'methods',
      'property': 'properties',
      'event': 'events'
    };
    var items = Object.keys(parsedDocs['classes']).map(function(className){
      var directory = docsDir + '/' + className;

      /*
        Write the class file:
          s3-bucket/
            1.x.x/
              Ember.SomeClass.json

        ```Ember.SomeClass.json
        {
          isPrivate: false,
          description: "<p>some html</p>",
          extends: "Ember.Object",
          file: "packages/ember-runtime/lib/system/each_proxy.js",
          line: 94,
          module: "ember",
          name: "Ember.EachProxy",
          submodule: "ember-runtime"
          methods: [],
          properties: [],
          events: []
        }
        ```

      */
      var klassJSON = parsedDocs['classes'][className];
      klassJSON.methods = [];
      klassJSON.properties = [];
      klassJSON.events = [];
      klassJSON.isPrivate = klassJSON.access === 'private';
      klassJSON.constType = klassJSON.static ? 'Namespace' : 'Class';


      // find this class by name
      var klass = dataBrowser.find(className);
      klass.items().forEach(function(item){
        var json = {
          name: item.name,
          isPrivate: item.access === 'private',
          inheritedFrom: item.inheritedFrom
        }

        switch (item.itemtype) {
          case "property":
            klassJSON.properties.push(json)
            break;
          case "method":
            klassJSON.methods.push(json)
            break;
          case "event":
            klassJSON.events.push(json)
            break;
        }
      });

      fs.writeFileSync(directory + '.json', toJSON(parsedDocs['classes'][className]))

      // create the `Ember.SomeClass/` directory for additional detailed json files
      fs.mkdirSync(directory);

      /*
          Write the methods, properties, events files:
            s3-bucket/
              1.x.x/
                Ember.SomeClass/
                  methods.json
                  properties.json
                  events.json

      */
      ['method', 'property', 'event'].forEach(function(type){
        var items = klass.items().filter(function(item){
          return item.itemtype === type;
        });

        fs.writeFileSync(directory + '/' + typePlurals[type] + '.json', toJSON(items));
      });
    });

    /*
      Write the module files:
        s3-bucket/
          1.x.x/
            modules/
              some-module.json


      ```some-module.json
        {
          name: 'some-module',
          description: '<p>some paresed markdown</p>'
          submodules: [{name: 'another-module'}, ...],
          classes: [{name: 'Namesapce.SomeClass'}, ...]
          requires: [{name: 'some-other-module'}, ...]

        }
      ```

    */
    fs.mkdirSync(docsDir + '/modules');
    eachValue(parsedDocs['modules'], function(module){
      var directory = docsDir + '/modules';
      var json = {
        name: module.name,
        classes: Object.keys(module.classes).sort().map(function(name) { return {name: name}}),
        submodules: Object.keys(module.classes).sort().map(function(name) { return {name: name}}),
        requires: (module.requires ||[]).sort().map(function(name) { return {name: name}})
      }
      fs.writeFileSync(directory + '/' + module.name + '.json', toJSON(json));
    });

    // return the tmp dir that has all the files written into it
    return tmp;
  },
  cleanup: function(){
    quickTemp.remove(this, tmpName);
  }
};

module.exports = Tree;
