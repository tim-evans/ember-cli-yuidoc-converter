function eachValue(object, callback){
  var keys = Object.keys(object);
  return keys.map(function(k){
    return callback(object[k]);
  })
}

function sortByNameProperty(a,b){
  if (a.name < b.name) {
    return -1;
  } else if (a.name > b.name) {
    return 1;
  } else {
    return 0;
  }
}

function toJSON(object, minify){
  var indent = minify ? null : 2;
  return JSON.stringify(object, null, indent);
}

function copy(obj){
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  toJSON: toJSON,
  sortByNameProperty: sortByNameProperty,
  eachValue: eachValue,
  copy: copy
};
