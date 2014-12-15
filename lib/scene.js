
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

    this._last = null; // hack -- should be keeping objects in ordered structure anyway.
    this._objects = d3.map();
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
  
  /* find the given object is in the scene using geometric
  (i.e. deep) equality rather than reference ===. */
  find(obj) {
    let objects = this._objects.values();
    for(let i = 0; i < objects.length; i++) {
      if(this.equal(objects[i], obj)) return objects[i];
    }
    return null;
  }
  
  /**  
   * is - Get an equality-testing callback for the given object.  
   *    
   * @param  {Geom|string} obj Either the name of the object to test or the object itself.
   * @return {Geom~boolean} a function that tests whether its argument is geometrically equal to obj.
   */   
  is(obj) {
    if(typeof obj === 'string') { obj = this.get(obj); }
    return (secondObj) => (obj && this.equal(obj, secondObj));
  }
  
  /**  
  * is - Get an NON-equality-testing callback for the given object.  
  *    
  * @param  {Geom|string} obj Either the name of the object to test or the object itself.
  * @return {Geom~boolean} a function that tests whether its argument is NOT geometrically equal to obj.
  */   
  isnt(obj) {
    if(typeof obj === 'string') { obj = this.get(obj); }
    return (secondObj) => (obj && !this.equal(obj, secondObj));
  }
  
  last() {
    return this._last;
  }
  
  get(name) {
    return this._objects.get(name);
  }
  
  point(name, x, y) {
    return this.add(new Point(name, x, y));
  }
  
  circle(name, centerId, boundaryId) {
    return this.add(new Circle(name, this.get(centerId), this.get(boundaryId)));
  }
  
  segment(name, id1, id2) {
    return this.add(new Segment(name, this.get(id1), this.get(id2)));
  }
  
  line(name, id1, id2) {
    return this.add(new Line(name, this.get(id1), this.get(id2)));
  }
  
  intersection(name, id1, id2, which) {
    let o1 = this.get(id1),
        o2 = this.get(id2);
    if(!o1) throw new Error("Can't find object "+id1);
    if(!o2) throw new Error("Can't find object "+id2);

    return this.add(new Intersection(name, o1, o2, which));
  }
  
  group(tag) {
    this._currentTag = tag;
    return this;
  }
  
  add(object) {
    // if we already have this object, and it's the same type, then update the
    // existing one in place.
    let existing = this._objects.get(object.name);
    if (existing && (existing.constructor.name === object.constructor.name)) {
      for(let prop in object) existing[prop] = object[prop];
      object = existing;
    }
    // if an object of the same name but different type or an object that is
    // geometrically equivalent already exists in the scene, do nothing.
    else if(existing || (existing = this.find(object))) {
      console.log('Tried to add '+object+' but '+existing+' is already in scene.');
      return this;
    }
    // add a new object to the scene.
    else {
      object.name = object.name || this.freeName();
      this._objects.set(object.name, object);
    }
    
    if (this._currentTag) addClass(object, this._currentTag);
    if (object.free) addClass(object, 'free-point');
    
    this.update(object);
    
    this._last = object;
    return this;
  }
  
  freeName() {
    let keys = this._objects.keys(),
    id = 0;
    for(;keys.indexOf('object'+id) >= 0; id++);
    return 'object'+id;
  }
  
  /**  
   * update - Update objects to reflect changes in dependent objects. (E.g.,
   * update Intersection coordinates when the intersected objects have changed.)
   *    
   * @param {Geom} root The object from which to start walking the dependency graph.  
   */
  // TODO: respect `root` parameter, and do an actual DAG walk.
  update(root) {
    this._objects.values()
      .filter(obj => obj instanceof Intersection)
      .forEach(obj => obj.update())
  }
  
  logState(label) {
    let self = this;
    let objects = this._objects.values();
    let points = this.points();

    let state = {
      label,
      time: (new Date()).toString(),
      objects: objects.map(o => o.toString()),
    }
    this.log.push(state);
  }
}

module.exports = Scene;
