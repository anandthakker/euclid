let P = require('./point').P,
    Line = require('./line'),
    {distanceSquared, distance} = require('../calc');

class Segment extends Line {
  constructor(name, p1, p2) {
    super(name, p1, p2);
    this._clip = true;
    
    Object.defineProperties(this, {
      p: {
        // TODO: clone point themselves?
        get() {
          return [].concat(this._p);
        }
      },
      
      lengthsq: {
        get() {
          return distanceSquared(this._p[0], this._p[1]);
        }
      },
      
      length: {
        get() {
          return distance(this._p[0], this._p[1]);
        }
      }
    })
  }
  
  toString() {
    return 'Segment' + super.toString();
  }
  
  /*
  clip the given line (or line segment) to the given bounding box, where `bounds`
  must have `left`, `right`, `top`, and `bottom` properties.
  */
  static clip(bounds, line) {
    var [p1, p2] = line._p;
    
    var left = line.y(bounds.left),
    right = line.y(bounds.right),
    top = line.x(bounds.top),
    bottom = line.x(bounds.bottom);
    
    if (p1.x > p2.x) {
      let t = p1;
      p1 = p2;
      p2 = t;
    }
    if (left && left >= bounds.top && left <= bounds.bottom) {
      // intersects left wall
      p1 = P(bounds.left, left);
    }
    if (right && right >= bounds.top && right <= bounds.bottom) {
      // intersects right wall
      p2 = P(bounds.right, right);
    }
    
    if (p1.y > p2.y) {
      let t = p1;
      p1 = p2;
      p2 = t;
    }
    if (top && top >= bounds.left && top <= bounds.right) {
      // intersects top wall
      p1 = P(top, bounds.top);
    }
    if (bottom && bottom >= bounds.left && bottom <= bounds.right) {
      // intersects bottom wall
      p2 = P(bottom, bounds.bottom);
    }
    
    let clipped = new Segment(null, p1, p2);
    clipped.parent = line;
    return clipped;
  }
}


module.exports = Segment;
