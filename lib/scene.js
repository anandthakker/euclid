let _ = require('lodash'),
    d3 = require('d3'), // TODO: remove dep; only being used for d3.map() and d3.set().
    {Intersection, intersect} = require('./intersection'),
    {Point, Line, Segment, Circle, equalWithin} = require('./model');


function addClass(obj, klass) {
  obj.classes = obj.classes || d3.set();
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
    if (this.contains(object)) return this;
    
    this._objects.push(object);
    if (this._currentTag) addClass(object, this._currentTag);
    if (!(object instanceof Point)) {
      this.updateIntersections();
    } else if (object.free) {
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
  
  group(tag) {
    this._currentTag = tag;
    return this;
  }
  
  updateIntersections() {
    let key = (intersection) => {
      return intersection.objects
      .map(o => this._objects.indexOf(o))
      .join(':') + '[' + intersection._index + ']'
    }
    
    let finite = this._objects
    .filter(obj => !(obj instanceof Point))
    .map(obj => (obj instanceof Line) ? Segment.clip(this.bounds, obj) : obj)
    
    let newIntersections = [];
    for (let i = 0; i < finite.length; i++) {
      for (let j = 0; j < i; j++) {
        let points = intersect(finite[i], finite[j]);
        points.forEach((p, k) => {
          p._index = k; // TODO: Clean up this hack. (See below for usage.)
          this._snapPoint(p);
          newIntersections.push(p);
        })
      }
    }
    
    let newKeys = newIntersections.map(i => key(i));
    for (let i = 0; i < newIntersections.length; i++) {
      if (this._intersections.has(newKeys[i])) { // update existing intersections
        _.assign(this._intersections.get(newKeys[i]), newIntersections[i]);
      } else { // add new ones
        this._intersections.set(newKeys[i], newIntersections[i]);
        this.add(newIntersections[i]);
      }
    }
    // remove stale ones from the map
    if (newIntersections.length < this._intersections.size()) {
      this._intersections.keys().forEach(k => {
        if (newKeys.indexOf(k) < 0) {
          this._intersections.remove(k);
        }
      });
    }
    // remove stale ones from the scene
    this._objects = this._objects
    .filter(o => !(o instanceof Intersection) || this._intersections.has(key(o)))
    
    this._intersections.values().forEach(function(p, i) {
      addClass(p, 'intersection-point');
    });
  }
  
  _snapPoint(p) {
    let points = this.points();
    for (let j = 0; j < points.length; j++) {
      if (this.equal(points[j], p)) {
        p.x = points[j].x;
        p.y = points[j].y;
        return;
      }
    }
  }
}

module.exports = Scene;
