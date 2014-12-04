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
    this.bounds.width = this.bounds.right - this.bounds.left;
    this.bounds.height = this.bounds.bottom - this.bounds.top;

    this._lastSceneId = 0;
    this._objects = d3.map();
    this._intersections = d3.map();
    this.equal = equalWithin(Math.sqrt(2));
    this.log = [];
  }
  
  /* return the point with given index; equivalent to points()[index] */
  P(index) {
    return this.points()[index];
  }
  
  /* return an array of all Points in the scene */
  points() {
    return this._objects.values().filter(o => o instanceof Point)
  }
  
  /* return an array of all objects in the scene */
  objects() {
    return this._objects.values();
  }
  
  /* test whether given object is in the scene using geometric
  (i.e. deep) equality rather than reference ===. */
  contains(obj) {
    return this._objects.values()
    .some(p => this.equal(p, obj))
  }
  
  add(object) {
    if (this._objects.has(object._sceneId) || this.contains(object)) {
      return this;
    }
    
    object._sceneId = this._lastSceneId++;
    this._objects.set(object._sceneId, object);
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
    // key for the _intersections map, which we use to identify Intersection
    // objects as equivalent between updates (so that we can mutate rather
    // than replace them).  Would be nice to do this with immutable approach,
    // but we'd then need to keep a tree of dependent shapes -- e.g., a 
    // circle is centered on an intersection point.
    let objectId = (o) => (!o._sceneId && o.parent) ? objectId(o.parent) : o._sceneId;
    let mapkey = (intersection, index) => {
      return intersection.objects
      .map(o => objectId(o))
      .sort()
      .join(':') + '[' + index + ']'
    }
    
    let finite = this._objects.values()
      .filter(obj => !(obj instanceof Point))
      .map(obj => (obj instanceof Line) ? Segment.clip(this.bounds, obj) : obj)
    let updated = [];
    for (let i = 0; i < finite.length; i++) {
      for (let j = 0; j < i; j++) {
        // calculate intersections for this pair of points.
        let points = intersect(finite[i], finite[j]);
        
        // could have more than one intersection; process each one.
        points.forEach((p, k) => {
          let key = mapkey(p, k);

          // "Snap" coordinates to the first existing point that is indistinguishable.
          this._snapPoint(p);
          
          // update existing or add new intersection.
          let existing = this._intersections.get(key);
          if (existing) {
            _.assign(existing, p);
            p = existing;
          } else {
            this._intersections.set(key, p);
            p._intersectionMapKey = key;
          }
          
          this.add(p);
          updated.push(key);
        })
      }
    }

    // remove stale ones from the map
    if (updated.length < this._intersections.size()) {
      this._intersections.keys()
      .filter(key => updated.indexOf(key) < 0)
      .forEach(key => this._intersections.remove(key))
    }
    
    // remove stale ones from the scene
    this._objects.values()
    .filter(o => (o instanceof Intersection) &&
      !this._intersections.has(o._intersectionMapKey))
    .forEach(point => this._objects.remove(point._sceneId));
    
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
  
  logState(label) {
    let self = this;
    let objects = this._objects.values();
    let points = this.points();

    function print(object, short) {
      let n = '['+object._sceneId+']';
      
      if (object instanceof Point)
        return n +
          (short ? '' : (object.toString() + (object.objects || []).map(o=>o._sceneId).join(',')));
      else if (object instanceof Circle)
        return n + 'circle(' + print(object.center, true) + ' - ' + print(object.boundaryPoint, true) + ')';
      else if (object instanceof Line)
        return n + ((object instanceof Segment) ? 'segment' : 'line') +
          '(' + print(object._p[0], true) + ' - ' + print(object._p[1], true) + ')';

      return object.toString();
    }

    let state = {
      label,
      time: (new Date()).toString(),
      objects: objects.map(o => print(o)),
      intersections: this._intersections.keys()
    }
    this.log.push(state);
  }
}

module.exports = Scene;
