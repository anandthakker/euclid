
let _ = require('lodash')
let Set = require('./set')
let {Point, Circle, Line, Segment, equalWithin} = require('./geometry'),
    {intersect, Intersection} = require('./intersection')

function addClass(obj, klass) {
  obj.classes = obj.classes || new Set();
  obj.classes.add(klass);
}

class Scene {
  
  constructor(bounds) {
    this.bounds = bounds;
    this._objects = new Set(d=>d.toString());
    this.equal = equalWithin(Math.sqrt(2));
  }
  
  /* return point with given id */
  P(id) {
    return this.allPoints()[id];
  }
  
  allPoints() {
    return this._objects
      .values()
      .filter(o => o instanceof Point)
      .concat(this.intersections())
  }
  
  freePoints() {
    return this.allPoints().filter(p => p.free)
  }
  
  intersections() {
    if(!this._intersections) this.updateIntersections();
    return [].concat(this._intersections.filter(i=>!this.contains(i)));
  }
  
  add(object) {
    if(this.contains(object)) return this;
    this._objects.add(object);
    if(object instanceof Circle) {
      this.updateIntersections();
    }
    else if(object instanceof Line) {
      this.updateIntersections();
    }
    else if(object instanceof Point && object.free) {
      addClass(object, 'free-point');
    }
    return this;
  }
  
  
  point(x, y) {
    this.add(new Point(x, y));
    return this;
  }

  circle(centerId, boundaryId) {
    this.add(new Circle(this.P(centerId), this.P(boundaryId)));
    return this;
  }
  
  segment(id1, id2) {
    this.add(new Segment(this.P(id1), this.P(id2)));
    return this;
  }
  
  line(id1, id2) {
    this.add(new Line(this.P(id1), this.P(id2)));
    return this;
  }
  
  
  
  contains(obj) {
    return this._objects
      .values()
      .some(p => this.equal(p, obj))
  }
  
  objects() {
    return [].concat(this._objects.values(), this.intersections());
  }
  
  updateIntersections() {
    let finite = this._objects.values().map(obj=>
      (obj instanceof Line) ? Segment.clip(this.bounds, obj) : obj);
    
    let newIntersections = [];
    for(let i = 0; i < finite.length; i++) {
      for(let j = 0; j < i; j++) {
        Array.prototype.push.apply(newIntersections, intersect(finite[i], finite[j]));
      }
    }
    
    this._intersections = this._intersections || [];
    for(let i = 0; i < newIntersections.length; i++) {
      if(i < this._intersections.length) {
        // update existing intersections
        _.assign(this._intersections[i], newIntersections[i]);
      }
      else {
        // add new ones
        this._intersections.push(newIntersections[i]);
      }
    }
    // remove stale ones
    let diff = newIntersections.length - this._intersections.length;
    if(diff > 0)
      this._intersections.splice(newIntersections.length, diff);
    
    this._intersections.forEach(function(p,i) {
      addClass(p, 'intersection-point');
    });
  }
}

module.exports = Scene;
