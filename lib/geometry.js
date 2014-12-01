
let _ = require('lodash')

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  toString() { return '(' + this.x + ',' + this.y + ')'; }
}
function P(x, y) {
  return new Point(x, y);
}

class Circle {
  
  constructor(center, a) {
    this.center = center;
    if(a instanceof Point) { this._fromCenterAndBoundaryPoint(center, a); }
    else if(typeof a === 'number') { this._fromCenterAndRadius(center, a); }
  }
  
  _fromCenterAndRadius(center, radius) {
    this.radius = radius;
  }
  
  _fromCenterAndBoundaryPoint(center, boundaryPoint) {
    this.boundaryPoint = boundaryPoint;
    this.radiusSegment = new Segment(center, boundaryPoint);
    Object.defineProperties(this, {
      radius: {
        get() { return this.radiusSegment.length; }
      }
    })
  }
  
  y(x) {
    var w = Math.abs(x - this.center.x);
    if (w > this.radius) return null;
    if (w === this.radius) return P(x, this.center.y);
    
    var h = Math.sqrt(this.radius * this.radius - w * w);
    return [this.center.y + h, this.center.y - h];
  }
  
  toString() { return 'Circle['+this.center.toString()+';'+this.radius+']'; }
}

class Line {
  constructor(p1, p2) {
    if (!p2) {
      this._p = p1.slice(0)
    } else {
      this._p = [p1, p2];
    }
    
    this._clip = false;
    
    Object.defineProperties(this, {
      // TODO: I don't like dx and dy on the line class...
      dx: {
        get() {
          return this._p[1].x - this._p[0].x;
        }
      },
      dy: {
        get() {
          return this._p[1].y - this._p[0].y;
        }
      },
      theta: {
        get() {
          return Math.atan2(this.dy, this.dx);
        }
      },
      m: {
        get() {
          if (this.dx === 0) return null;
          else return this.dy / this.dx;
        }
      }
    })
  }
  
  y(x) {
    if ((this.dx === 0) ||
      (this._clip && (Math.min(this._p[0].x, this._p[1].x) > x ||
      Math.max(this._p[0].x, this._p[1].x) < x)))
      return null;
    else return this._p[0].y + (x - this._p[0].x) * (this.dy) / (this.dx)
  }
  
  x(y) {
    if ((this.dy === 0) ||
      (this._clip && (Math.min(this._p[0].y, this._p[1].y) > y ||
      Math.max(this._p[0].y, this._p[1].y) < y)))
      return null;
    else return this._p[0].x + (y - this._p[0].y) * (this.dx) / (this.dy)
  }
  
  toString() { 
    return 'Line['+
      this._p[0].toString() + ';' + this._p[0].toString() +
      ']';
  }
}

class Segment extends Line {
  constructor(p1, p2) {
    super(p1, p2);
    this._clip = true;
    
    Object.defineProperties(this, {
      p: {
        // TODO: clone point themselves?
        get() { return [].concat(this._p); }
      },
      
      lengthsq: {
        get() {
          return this.dx*this.dx + this.dy*this.dy;
        }
      },
      
      length: {
        get() {
          return Math.sqrt(this.lengthsq);
        }
      }
    })
  }
  
  toString() {
    return 'Segment'+super.toString();
  }
  
  static clip(bounds, line) {
    var [p1, p2] = line._p;
    
    var left = line.y(bounds.left),
    right = line.y(bounds.right),
    top = line.x(bounds.top),
    bottom = line.x(bounds.bottom);
    
    if(p1.x > p2.x) {
      let t = p1;
      p1 = p2;
      p2 = t;
    }
    if(left && left >= bounds.top && left <= bounds.bottom) {
      // intersects left wall
      p1 = P(bounds.left, left);
    }
    if(right && right >= bounds.top && right <= bounds.bottom) {
      // intersects right wall
      p2 = P(bounds.right, right);
    }
    
    if(p1.y > p2.y) {
      let t = p1;
      p1 = p2;
      p2 = t;
    }
    if(top && top >= bounds.left && top <= bounds.right) {
      // intersects top wall
      p1 = P(top, bounds.top);
    }
    if(bottom && bottom >= bounds.left && bottom <= bounds.right) {
      // intersects bottom wall
      p2 = P(bottom, bounds.bottom);
    }
    
    return new Segment(p1, p2);
  }
}

module.exports = { P, Point, Circle, Segment, Line }
