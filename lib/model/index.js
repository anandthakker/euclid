
let Point = require('./point'),
    Circle = require('./circle'),
    Line = require('./line'),
    Segment = require('./segment');

module.exports = {
  P: Point.P,
  Point,
  Circle,
  Segment,
  Line,
  equalWithin
};


/* return a deep-equality test function that checks for geometric object
   equality using the given distance threshold for point equality; i.e., if 
   two points are closer than `threshold`, consider them equal. */
function equalWithin(threshold) {
  threshold = threshold || 0;
  return function equal(o1, o2) {
    if (Array.isArray(o1) && Array.isArray(o2)) {
      return o1.every((obj, index) => equal(obj, o2[index]))
    }
    if (typeof o1 === 'number' && typeof o2 === 'number') {
      return Math.abs(o1 - o2) < threshold;
    }
    if (o1 instanceof Point && o2 instanceof Point) {
      if(o1.x === null || o2.x === null || o1.y === null || o2.y === null)
        return false;
      else
        return equal(Math.abs(o1.x - o2.x) + Math.abs(o1.y - o2.y), 0);
    }
    if (o1 instanceof Circle && o2 instanceof Circle) {
      return equal(o1.radius, o2.radius) && equal(o1.center, o2.center);
    }
    if (o1 instanceof Segment && o2 instanceof Segment) {
      var p1 = [].concat(o1.p),
          p2 = [].concat(o2.p)
      // ensure points from both segments are in the same order 
      // (left to right or right to left).
      if(p1[0].x > p1[1].x && p2[0].x < p2[0].x) p1.reverse();
      // then delegate to point equality
      return equal(p1, p2)
    }
    if (o1 instanceof Line && o2 instanceof Line) {
      return equal(o1.m, o2.m) && equal(o1.y(0), o2.y(0)) && equal(o1.x(0), o2.x(0));
    }

    // fallback to object equality
    return o1 === o2;
  }
}
