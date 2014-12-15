
let uniq = require('uniq');

let {Point, Line, Segment, Circle} = require('./model'),
    P = Point.P,
    dd = require('./calc').distanceSquared;

/* helpers */
function comparePoints(p, q) { return (p.x === q.x && p.y === q.y) ? 0 : 1; }
function sq(a) { return a*a; }
function between(x, a, b) {
  let left = Math.min(a,b),
      right = Math.max(a,b);
  return (left <= x && x <= right)
}

/*
  Intersection of two objects; returns an array, possibly empty, of 
  intersection points.
*/

/**
 * intersect - Find the intersection(s) of the given two objects.
 *  
 * @param  {Geom} o1 first object 
 * @param  {Geom} o2 second object 
 * @return {Array.<Point>}    Points of intersection between the two objects. 
 */ 
function intersect(o1, o2) {
  if(o1 instanceof Circle && o2 instanceof Circle)        // circle-circle
    return intersectCircleCircle(o1, o2);
  // if only one is a circle, it should be first.
  else if(o2 instanceof Circle)
    return intersect(o2, o1); 
  else if(o1 instanceof Circle && o2 instanceof Segment)  // circle-segment
    return intersectCircleLine(o1, o2, true);
  else if(o1 instanceof Circle && o2 instanceof Line)     // circle-line
    return intersectCircleLine(o1, o2, false);
  else if(o1 instanceof Segment && o2 instanceof Segment) // segment-segment
    return intersectLineLine(o1, o2, true);
  // if only one is a segment, it should be first.
  else if(o2 instanceof Segment)
    return intersect(o2, o1);
  else if(o1 instanceof Line && o2 instanceof Line)       // line-line
    return intersectLineLine(o1, o2, false);

  // TODO: circle-point, segment-point, point-point
  else if(o2 instanceof Point || o1 instanceof Point)
    return [];
    
  else throw new Error('Cannot intersect ' + 
    o1.constructor.name + ' and ' + o2.constructor.name);
  
}

function intersectCircleCircle(c1, c2) {
  let dsq = dd(c1.center, c2.center);
  let d = Math.sqrt(dsq);
  
  if(d > c1.radius + c2.radius) { return []; }
  else if(d < c1.radius - c2.radius) { return []; }
  else if(dsq === 0) { return []; }
    
  let a = (c1.radiussq - c2.radiussq + dsq) / (2*d);
  let h = Math.sqrt(Math.max(c1.radiussq - sq(a), 0));
  let cx = c1.center.x + a*(c2.center.x - c1.center.x)/d;
  let cy = c1.center.y + a*(c2.center.y - c1.center.y)/d;
  
  let nx = h * (c1.center.y - c2.center.y)/d;
  let ny = h * (c1.center.x - c2.center.x)/d;
  
  return uniq([P(0, cx+nx, cy-ny), P(1, cx-nx, cy+ny)], comparePoints);
}

function intersectLineLine(s1, s2, clip) {
  let [{x:x1, y:y1}, {x:x2, y:y2}] = s1._p;
  let [{x:x3, y:y3}, {x:x4, y:y4}] = s2._p;
  let s = (-s1.dy * (x1 - x3) + s1.dx * (y1 - y3)) / (-s2.dx * s1.dy + s1.dx * s2.dy)
  let t = (s2.dx * (y1 - y3) - s2.dy * (x1 - x3)) / (-s2.dx * s1.dy + s1.dx * s2.dy)
  
  if(!clip || (between(s,0,1) && between(t,0,1)))
    return [P(0, x1 + t*s1.dx, y1 + t*s1.dy)]
  else
    return []; // no collision
}

/* http://mathworld.wolfram.com/Circle-LineIntersection.html */
function intersectCircleLine(c, s, clip) {
  let [{x:x1, y:y1}, {x:x2, y:y2}] = s._p;
  let {x:x0, y:y0} = c.center;

  // note the translation (x0, y0)->(0,0).
  let D = (x1-x0)*(y2-y0) - (x2-x0)*(y1-y0);
  let Dsq = sq(D);
    
  let lensq = sq(s.dx)+sq(s.dy);
  let disc = Math.sqrt(sq(c.radius)*lensq - Dsq);
  if(disc < 0) { return []; }

  let cx = D*s.dy / lensq, cy = -D*s.dx / lensq;
  let nx = (s.dy < 0 ? -1*s.dx : s.dx) * disc / lensq,
      ny = Math.abs(s.dy) * disc / lensq;

  // translate (0,0)->(x0, y0).
  return uniq([P(0, cx + nx + x0, cy + ny + y0), 
               P(1, cx - nx + x0, cy - ny + y0)], comparePoints)
        .filter(p => (clip ? between(p.x,x1,x2) && between(p.y,y1,y2) : true));
}


module.exports = {
  intersect,
  intersectCircleCircle,
  intersectCircleLine,
  intersectLineLine}
  
