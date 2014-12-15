
let Geom = require('./geom'),
    Point = require('./point'),
    {intersect} = require('../intersection');

module.exports=
class Intersection extends Point {
  
  
  /**  
   * @param {string} name
   * @param {...Geom} objects to be intersected
   * @param {number|Geom~boolean} [which] optional array index or filter callback in case there are multiple intersections.
   */   
  constructor(name, ...objects) {
    if(name instanceof Geom) {
      objects.shift(name);
      name = null;
    }
    super(name, null, null);
    
    this.which = /function|number/.test(typeof objects[objects.length - 1]) ?
      objects.pop() : 0;
    this.objects = objects;
    this.free = false;
  }
  
  update() {
    let result = intersect.apply(null, this.objects);
    if(typeof this.which === 'function')
      result = result.filter(this.which)[0];
    else
      result = result[this.which];
      
    if(result) {
      ({x: this.x, y: this.y} = result);
    }
    else {
      this.x = this.y = null;
    }
  }
  
  toString(verbose) {
    let pstr = super.toString();
    return (!verbose) ? pstr :
    pstr + '; intersection of: ' + this.objects.map(o => o.toString()).join(',');
  }
}
