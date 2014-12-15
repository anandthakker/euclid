let Geom = require('./geom'),
    Point = require('./point'),
    Segment = require('./segment'),
    {distance, distanceSquared} = require('../calc');

class Circle extends Geom {
  
  constructor(name, center, a) {
    if(typeof a === 'undefined') {
      a = center;
      center = name;
      name = null;
    }
    
    super(name);
    this.center = center;
    if (a instanceof Point) {
      this._fromCenterAndBoundaryPoint(center, a);
    } else if (typeof a === 'number') {
      this._fromCenterAndRadius(center, a);
    }
  }
  
  _fromCenterAndRadius(center, radius) {
    this.radius = radius;
    Object.defineProperties(this, {
      radiussq: {
        get() {
          return this.radius * this.radius;
        }
      }
    });
  }
  
  _fromCenterAndBoundaryPoint(center, boundaryPoint) {
    this.boundaryPoint = boundaryPoint;
    Object.defineProperties(this, {
      radius: {
        get() {
          return distance(this.boundaryPoint, this.center);
        }
      },
      radiussq: {
        get() {
          return distanceSquared(this.boundaryPoint, this.center);
        }
      }
    })
  }
  
  y(x) {
    var w = Math.abs(x - this.center.x);
    if (w > this.radius) return null;
    if (w === this.radius) return new Point(x, this.center.y);
    
    var h = Math.sqrt(this.radius * this.radius - w * w);
    return [this.center.y + h, this.center.y - h];
  }
  
  contains(p) {
    return distanceSquared(p, this.center) === this.radiussq;
  }
  
  toString() {
    return 'Circle' + super.toString() + '[' + this.center.toString() + ';' + this.radius + ']';
  }
}

module.exports = Circle;
