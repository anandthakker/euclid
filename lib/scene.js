
let d3 = require('d3'), // TODO: remove dep; only being used for d3.map() and d3.set().
    {
      Point,
      Line,
      Segment,
      Circle,
      equalWithin
    } = require('./model'),
    Intersection = require('./model/intersection');


function addClass(obj, klass) {
  obj.classes = obj.classes || d3.set();
  obj.classes.add(klass);
}

class Scene {
  
  constructor(bounds) {
    this.bounds = bounds;
    this.bounds.width = this.bounds.right - this.bounds.left;
    this.bounds.height = this.bounds.bottom - this.bounds.top;

    this._objects = d3.map();
    this._intersections = d3.map();
    this.equal = equalWithin(Math.sqrt(2));
    this.log = [];
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
  
  
  /**  
   * is - Get an equality-testing callback for the given object.  
   *    
   * @param  {Geom|string} obj Either the name of the object to test or the object itself.
   * @return {Geom~boolean} a function that tests whether its argument is geometrically equal to obj.
   */   
  is(obj) {
    if(typeof obj === 'string') { obj = this.get(obj); }
    return (secondObj) => this.equal(obj, secondObj);
  }
  
  /**  
  * is - Get an NON-equality-testing callback for the given object.  
  *    
  * @param  {Geom|string} obj Either the name of the object to test or the object itself.
  * @return {Geom~boolean} a function that tests whether its argument is NOT geometrically equal to obj.
  */   
  isnt(obj) {
    if(typeof obj === 'string') { obj = this.get(obj); }
    return (secondObj) => !this.equal(obj, secondObj);
  }
  
  freeName() {
    // TODO: this is gonna get weird if we go above 26.
    let max = 'A'.charCodeAt(0) - 1,
    keys = this._objects.keys();
    for(let i = 0; i < keys.length; i++) {
      if(keys[i].length === 1)
        max = Math.max(keys[i].charCodeAt(0), max);
    }
    return String.fromCharCode(max+1);
  }
  
  add(object) {
    object.name = object.name || this.freeName();
    if (this._objects.has(object.name) || this.contains(object)) {
      console.log(object + " is already in scene. Not adding it again.");
      return this;
    }
    
    this._objects.set(object.name, object);
    if (this._currentTag) addClass(object, this._currentTag);
    if (!(object instanceof Point)) {
      this.updateIntersections();
    } else if (object.free) {
      addClass(object, 'free-point');
    }
    return this;
  }
  
  get(name) {
    return this._objects.get(name);
  }
  
  point(name, x, y) {
    if(!y) {
      y = x;
      x = name;
      name = null;
    }
    return this.add(new Point(name, x, y));
  }
  
  circle(name, centerId, boundaryId) {
    if(!boundaryId) {
      boundaryId = centerId;
      centerId = name;
      name = null;
    }
    return this.add(new Circle(name, this.get(centerId), this.get(boundaryId)));
  }
  
  segment(name, id1, id2) {
    if(!id2) {
      id2 = id1;
      id1 = name;
      name = null;
    }
    return this.add(new Segment(name, this.get(id1), this.get(id2)));
  }
  
  line(name, id1, id2) {
    if(!id2) {
      id2 = id1;
      id1 = name;
      name = null;
    }
    return this.add(new Line(name, this.get(id1), this.get(id2)));
  }
  
  intersection(name, id1, id2, which) {
    if(typeof id2 === 'undefined') {
      id2 = id1;
      id1 = name;
      name = null;
    }
    let point = new Intersection(name, this.get(id1), this.get(id2), which);
    point.update();
    return this.add(point);
  }
  
  group(tag) {
    this._currentTag = tag;
    return this;
  }
  
  updateIntersections() {
    this._objects.values()
      .filter(obj => obj instanceof Intersection)
      .forEach(obj => obj.update())
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

    let state = {
      label,
      time: (new Date()).toString(),
      objects: objects.map(o => o.toString()),
      intersections: this._intersections.keys()
    }
    this.log.push(state);
  }
}

module.exports = Scene;
