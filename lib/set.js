
let _ = require('lodash')

/*
* TODO: replace with external Set impl; this was just quickly on the train
* b/c no internet.
*/

class Set {
  constructor(cb) {
    this._cb = cb || x=>x;
    this._items = []
  }
  
  add(obj) {
    this._items.push(obj);
  }
  
  remove(obj) {
    _.remove(this._items, obj);
  }
  
  values() {
    this._items = _.unique(this._items, this._cb);
    return [].concat(this._items);
  }
  
}

module.exports = Set;
