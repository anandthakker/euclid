
let _ = require('lodash')
let d3 = require('d3')
let Set = require('./set')
let {Point, Circle, Line, Segment, equalWithin} = require('./geometry'),
    {intersections, Intersection} = require('./intersection')

function addClass(obj, klass) {
  obj.classes = obj.classes || new Set();
  obj.classes.add(klass);
}

class Scene {
  
  constructor(bounds) {
    this.bounds = bounds;
    this._objects = [];
    this._intersections = d3.map();
    this.equal = equalWithin(Math.sqrt(2));
  }
  
  /* return the point with given index; equivalent to points()[index] */
  P(index) {
    return this.points()[index];
  }
  
  /* return an array of all Points in the scene */
  points() {
    return this._objects.filter(o => o instanceof Point)
  }
  
  /* return an array of all objects in the scene */
  objects() {
    return [].concat(this._objects);
  }
  
  /* test whether given object is in the scene using geometric
    (i.e. deep) equality rather than reference ===. */
  contains(obj) {
    return this._objects
    .some(p => this.equal(p, obj))
  }
    
  add(object) {
    if(this.contains(object)) return this;

    this._objects.push(object);
    if(object instanceof Circle || object instanceof Line) {
      this.updateIntersections();
    }
    else if(object instanceof Point && object.free) {
      addClass(object, 'free-point');
    }
    return this;
  }
  
  point(x, y) {
    return this.add(new Point(x, y));
  }

  circle(centerId, boundaryId) {
    return this.add(new Circle(this.P(centerId), this.P(boundaryId)));
  }
  
  segment(id1, id2) {
    return this.add(new Segment(this.P(id1), this.P(id2)));
  }
  
  line(id1, id2) {
    return this.add(new Line(this.P(id1), this.P(id2)));
  }
  
  updateIntersections() {
    let key = (intersection) => {
      return intersection.objects
      .map(o => this._objects.indexOf(o))
      .join(':') + '['+intersection._index+']'
    }
    
    let newIntersections = intersections(this.bounds, this.objects());
    let newKeys = newIntersections.map(i => key(i));
    for(let i = 0; i < newIntersections.length; i++) {
      if(this._intersections.has(newKeys[i])) { // update existing intersections
        _.assign(this._intersections.get(newKeys[i]), newIntersections[i]);
      }
      else { // add new ones
        this._intersections.set(newKeys[i], newIntersections[i]);
        this.add(newIntersections[i]);
      }
    }
    // remove stale ones from the map
    if(newIntersections.length < this._intersections.size()) {
      this._intersections.keys().forEach(function(k) {
        if(newKeys.indexOf(k) < 0) { this._intersections.remove(k); }
      });
    }
    // remove stale ones from the scene
    this._objects = this._objects
    .filter(o => !(o instanceof Intersection) || this._intersections.has(key(o)))
    
    this._intersections.values().forEach(function(p,i) {
      addClass(p, 'intersection-point');
    });
  }
}

module.exports = Scene;
