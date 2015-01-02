var copy = require('./utils').copy;

/*

  Takes a YUIDoc data.json object and returns an object
  that allows you traverse the object to find out useful
  information.

  The only public method is `find`, which finds a klass by
  its name.

  var walker = new DataWalker(yuidoc);
  var klass = walker.find('SomeClass');

  This klass object can tell you

    * extends: the klass objects this klass inherits from
    * uses: an array of klass objects mixed into this klass
    * items: an array of methods, properties, and events for the klass

  Once a klass has been accessed, it is cached and subsequent lookup
  returns the cached object so lookup efficiency increase over time
  but the yuidoc object should be treated as immutable once passed in.

  @param {Object} YUIDoc object
  @return {Object} Data Browsing Object
*/
module.exports = function(yuidocJSON){
  var yuidoc = copy(yuidocJSON);

  function DataWalker(name){
    this.name = name;
    if (yuidoc.classes[name]) {
      this.yuidocData = yuidoc.classes[name];
    } else {
      // throw("no data for " + name + " in data")
      this.yuidocData = {};
    }
  }

  DataWalker.prototype = {
    items: function(){
      if (this.hasOwnProperty('_items')) { return this._items; }

      // poor man's Set.
      var itemsKeyedByName = {};

      var parents = [this.extends()];
      parents = parents.concat(this.uses());
      parents = parents.filter(function(i) { return !!i; }); // removes nulls

      // walk up the parent/uses tree and get the full
      // list of all "items" avaiable in this object type,
      // noting where the item originated.
      parents.forEach(function(parent){
        parent.items().forEach(function(item){
          var itemCopy = copy(item);
          itemCopy.inheritedFrom = itemCopy.inheritedFrom || parent.name;
          itemsKeyedByName[itemCopy.name] = itemCopy;
        });
      });

      // loop through every class item in the entire library looking for
      // items for only this class, adding them to the collection of
      // items keyed by name
      yuidoc['classitems'].forEach(function(classItem){
        if(classItem['class'] === this.name) {
          var itemCopy = copy(classItem);
          if(itemCopy.access === "private") { itemCopy.isPrivate= true; }

          itemsKeyedByName[classItem.name] = itemCopy;
        }
      }, this);

      this._items = Object.keys(itemsKeyedByName).map(function(key){ return itemsKeyedByName[key]; });
      return this._items;
    },
    extends: function(){
      if (this.hasOwnProperty('_extends')) { return this._extends; }

      var extended = this.yuidocData['extends'];

      if (extended && yuidoc['classes'][this.name]) {
        this._extends = DataWalker.find(extended);
      } else {
        this._extends = null;
      }

      return this._extends;
    },
    uses: function(){
      if (this.hasOwnProperty('_uses')) { return this._uses; }

      var uses = this.yuidocData['uses'] || [];

      this._uses = uses.map(function (use){return DataWalker.find(use)});
      return this._uses;
    }
  }



  /*
    cache the transforms from YUIDoc format to the format we use
    for docs.
  */
  DataWalker.classes = {};

  /*
    Create (and cache) a transformed class or return an already
    cached class object
  */
  DataWalker.find = function(name){
    var klass = DataWalker.classes[name] || new DataWalker(name);
    DataWalker.classes[name] = klass;
    return klass;
  }


  return DataWalker;
};
