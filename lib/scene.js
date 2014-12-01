
let _ = require('lodash')
let Set = require('./set')
let {Point, Circle, Line, Segment} = require('./geometry'),
    {intersect, Intersection} = require('./intersection')

function addClass(obj, klass) {
  obj.classes = obj.classes || new Set();
  obj.classes.add(klass);
}

class Scene {
  
  constructor(bounds) {
    this.bounds = bounds;
    this._objects = new Set();
  }
  
  /* return point with given id */
  P(id) {
    return allPoints()[id];
  }
  
  allPoints() {
    return this._objects
      .values()
      .filter(o => o instanceof Point)
      .concat(intersections())
  }
  
  freePoints() {
    return allPoints().filter(p => p.free)
  }
  
  intersections() {
    if(!this._intersections) this.updateIntersections();
    return [].concat(this._intersections);
  }
  
  add(object) {
    this._objects.add(object);
    if(object instanceof Circle) {
      // ensure center and boundaryPoint are in the scene.
      this.add(object.center);
      if(object.boundaryPoint) this.add(object.boundaryPoint);
    }
    else if(object instanceof Line) {
      // ensure defining points are in the scene.
      this.add(object._p[0]);
      this.add(object._p[1]);
    }
    else if(object instanceof Point && object.free) {
      addClass(object, 'free-point');
    }
    this.updateIntersections();
  }
  
  objects() {
    return [].concat(this._objects.values())
      .concat(this.intersections());
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
  }
}

module.exports = Scene;
