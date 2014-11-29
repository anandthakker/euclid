
let _ = require('lodash')

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
function P(x, y) {
  return new Point(x, y);
}

class Circle {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }
  
  y(x) {
    var w = Math.abs(x - this.center.x);
    if (w > this.radius) return null;
    if (w === this.radius) return P(x, this.center.y);
    
    var h = Math.sqrt(this.radius * this.radius - w * w);
    return [this.center.y + h, this.center.y - h];
  }
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
  
  /*
  parameter boundingRect is {left, top, right, bottom}
  returns a Segment clipped to the given bounds.
  */
  clip(boundingRect) {
    var x1 = this.x(boundingRect.top) || boundingRect.left,
    y1 = this.y(boundingRect.left) || boundingRect.top,
    x2 = this.x(boundingRect.bottom) || boundingRect.right,
    y2 = this.y(boundingRect.right) || boundingRect.bottom;
    return new Segment(P(x1, y1), P(x2, y2))
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
      }
    })
  }
}

module.exports = { P, Point, Circle, Segment, Line }
