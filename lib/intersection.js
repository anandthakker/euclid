
let {P, Point, Line, Segment, Circle} = require('./geometry')


function dd(p1, p2) {
  let dx = p1.x-p2.x
  let dy = p1.y-p2.y
  return dx*dx+dy*dy;
}

function sq(a) { return a*a; }

/* http://paulbourke.net/geometry/circlesphere/ */

function intersectCircleCircle(c1, c2) {
  let dsq = dd(c1.center, c2.center);
  if(dsq > sq(c1.radius + c2.radius)) { return []; }
  else if(dsq < sq(c1.radius - c2.radius)) { return []; }
    
  let d = Math.sqrt(dsq);
  let a = (sq(c1.radius) - sq(c2.radius) + dsq) / (2*d);
  let h = Math.sqrt(sq(c1.radius) - sq(a));
  let cx = c1.center.x + a*(c2.center.x - c1.center.x)/d;
  let cy = c1.center.y + a*(c2.center.y - c1.center.y)/d;
  
  let nx = h * (c1.center.y - c2.center.y)/d;
  let ny = h * (c1.center.x - c2.center.x)/d;
  
  return [P(cx+nx, cy-ny), P(cx-nx, cy+ny)];
}

function intersectSegmentSegment(s1, s2) {

}

function intersectCircleSegment(c, s) {
  
}

class Intersection extends Point {
  constructor(x, y, curves) {
    super(x,y);
    this.curves = curves;
  }
}



module.exports = {
  Intersection,
  intersectCircleCircle,
  intersectCircleSegment,
  intersectSegmentSegment}
  
