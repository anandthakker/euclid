
let {Point, Line, Segment, Circle} = require('./geometry');
let _ = require('lodash');

class Intersection extends Point {
  constructor(x, y, ...objects) {
    super(x,y);
    this.objects = objects;
  }
}


/* helpers */

function P(x, y, ...objects) { return new Intersection(x, y, ...objects); }

function unique(points) {
  return _.uniq(points, false, p=>p.toString())
}

function dd(p1, p2) {
  let dx = p1.x-p2.x
  let dy = p1.y-p2.y
  return dx*dx+dy*dy;
}

function sq(a) { return a*a; }



/* intersection of two objects */

function intersect(o1, o2) {
  if(o1 instanceof Circle && o2 instanceof Circle) // circle-circle
    return intersectCircleCircle(o1, o2);
  else if(o2 instanceof Circle) // if only one is a circle, it should be first.
    return intersect(o2, o1); 
  else if(o1 instanceof Circle && o2 instanceof Segment) // circle-segment
    return intersectCircleSegment(o1, o2);
  else if(o1 instanceof Segment && o2 instanceof Segment) // segment-segment
    return intersectSegmentSegment(o1, o2);
  else if(o2 instanceof Segment) // if only one is a segment, it should be first.
    return intersect(o2, o1);

  // TODO: circle-point, segment-point, point-point

  else throw new Error('Cannot intersect ' + 
    o1.constructor.name + ' and ' + o2.constructor.name);
  
}

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
  
  return unique([P(cx+nx, cy-ny, c1, c2),
                 P(cx-nx, cy+ny, c1, c2)]);
}

function intersectSegmentSegment(s1, s2) {
  let [{x:x1, y:y1}, {x:x2, y:y2}] = s1.p;
  let [{x:x3, y:y3}, {x:x4, y:y4}] = s2.p;
  let s = (-s1.dy * (x1 - x3) + s1.dx * (y1 - y3)) / (-s2.dx * s1.dy + s1.dx * s2.dy)
  let t = (s2.dx * (y1 - y3) - s2.dy * (x1 - x3)) / (-s2.dx * s1.dy + s1.dx * s2.dy)
  
  if(s >= 0 && s <= 1 && t >= 0 && t <= 1)
    return unique([P(x1 + t*s1.dx, y1 + t*s1.dy, s1, s2)]);
  else
    return []; // no collision
}

/* http://mathworld.wolfram.com/Circle-LineIntersection.html */
function intersectCircleSegment(c, s) {
  let [{x:x1, y:y1}, {x:x2, y:y2}] = s.p;
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
  return _.filter(unique([P(cx + nx + x0, cy + ny + y0, c, s), 
                          P(cx - nx + x0, cy - ny + y0, c, s)]),
                          p=>s.y(p.x));
}





module.exports = {
  Intersection,
  intersect,
  intersectCircleCircle,
  intersectCircleSegment,
  intersectSegmentSegment}
  
