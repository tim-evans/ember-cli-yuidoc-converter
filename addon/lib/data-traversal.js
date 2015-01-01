var copy = require('./utils').copy;

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
