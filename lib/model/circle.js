let Point = require('./point'),
    Segment = require('./segment'),
    {distanceSquared} = require('../calc');

class Circle {
  
  constructor(center, a) {
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
    this.radiusSegment = new Segment(center, boundaryPoint);
    Object.defineProperties(this, {
      radius: {
        get() {
          return this.radiusSegment.length;
        }
      },
      radiussq: {
        get() {
          return this.radiusSegment.lengthsq;
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
    return 'Circle[' + this.center.toString() + ';' + this.radius + ']';
  }
}

module.exports = Circle;
