
let Geom = require('./geom');

class Line extends Geom {
  constructor(name, p1, p2) {
    super(name);
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
      },
      
      left: {
        get() { return this._clip ? Math.min(this._p[0].x, this._p[1].x) : null; }
      },
      right: {
        get() { return this._clip ? Math.max(this._p[0].x, this._p[1].x) : null; }
      },
      top: {
        get() { return this._clip ? Math.min(this._p[0].y, this._p[1].y) : null; }
      },
      bottom: {
        get() { return this._clip ? Math.max(this._p[0].y, this._p[1].y) : null; }
      }
      
    })
  }
  
  y(x) {
    if ((this.dx === 0) || (this._clip && (this.left > x || this.right < x)))
      return null;
    else 
      return this._p[0].y + (x - this._p[0].x) * (this.dy) / (this.dx)
  }

  x(y) {
    if ((this.dy === 0) || (this._clip && (this.top > y || this.bottom < y)))
      return null;
    else 
      return this._p[0].x + (y - this._p[0].y) * (this.dx) / (this.dy)
  }
  
  contains(p) {
    let onLine = (this.dx !== 0) ? (this.y(p.x) === p.y) : (this.x(p.y) === p.x);
    return onLine && (!this._clip || 
      ((this.left <= p.x && p.x <= this.right) &&
      (this.top <= p.y && p.y <= this.bottom)));
  }

  toString() {
    return 'Line' + super.toString() + '[' +
      this._p[0].toString() + ';' + this._p[0].toString() +
      ']';
  }
}
        
module.exports = Line;
