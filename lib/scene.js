
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
    this.equal = equalWithin(1);
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
    return [].concat(this._intersections);
  }
  
  add(object) {
    if(this.contains(object)) return false;
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
    return true;
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
    this._intersections = [];
    for(let i = 0; i < finite.length; i++) {
      for(let j = i+1; j < finite.length; j++) {
        Array.prototype.push.apply(this._intersections, intersect(finite[i], finite[j]));
      }
    }
    this._intersections.forEach(function(p,i) {
      addClass(p, 'intersection-point');
    });
    // drop any that are already in the scene.
    this._intersections = this._intersections.filter(i=>!this.contains(i));
  }
}

module.exports = Scene;
