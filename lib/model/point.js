let Geom = require('./geom')

module.exports = class Point extends Geom {
  constructor(name, x, y) {
    super(name);
    this.x = x;
    this.y = y;
    this.free = true;
  }
  
  toString() {
    return super.toString() + '(' + this.x + ',' + this.y + ')';
  }
  
  /* shorthand function for constructing a point from coodinates */
  static P(name, x, y) {
    if(!y) {
      y = x;
      x = name;
      name = null;
    }
    return new Point(null, x, y);
  }
}
