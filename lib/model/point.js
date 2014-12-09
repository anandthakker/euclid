module.exports = class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.free = true;
  }
  
  toString() {
    return '(' + this.x + ',' + this.y + ')';
  }
  
   /* shorthand function for constructing a point from coodinates */
   static P(x, y) {
    return new Point(x, y);
  }
}
