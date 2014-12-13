
let d3 = require('d3'), // TODO: remove dep; only being used for d3.map() and d3.set().
    parser = require('euclid-parser'),
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
  
  
  parse(text, cb) {
    let parsedObjects = [],
        lines = text.split('\n');
        
    try {
      /* parse "[grouping]" statements directly, and geometry declarations using
       * the euclid-parser parser. */
      for(let i = 0; i < lines.length; i++) {
        lines[i] = lines[i].trim();
        if(/^\[.*\]$/.test(lines[i]))
          parsedObjects.push({
            type: 'group',
            name: lines[i].slice(1, -1)
          });
        else if(lines[i].length > 0)
          parsedObjects.push(parser.parse(lines[i])[0]);
      }
      
      /* remove from scene any existing objects that weren't declared in the parsed text */
      let parsedNames = parsedObjects.map(o => o.name);
      this._objects.keys()
      .filter(name => parsedNames.indexOf(name) < 0)
      .forEach(name => this._objects.remove(name));
      
      /* now update scene with parsed objects */
      for(let i = 0; i < parsedObjects.length; i++) {
        let item = parsedObjects[i];

        switch(item.type) {
          case 'group':
            this.group(item.name); break;
          case 'point':
            this.point(item.name, item.x, item.y); break;
          case 'line':
            this.line(item.name, item.p1, item.p2); break;
          case 'segment':
            this.segment(item.name, item.p1, item.p2); break;
          case 'circle':
            this.circle(item.name, item.center, item.boundaryPoint); break;
          case 'intersection':
            let which = 0;
            if(item.which && item.which.op === 'not')
              which = this.isnt(item.which.args[0]);
            this.intersection(item.name, item.o1, item.o2, which);
            break;
        }
      }
      

      if(cb) cb(true);
    } catch(e) {
      if(cb) cb(null, e);
    }
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
    // if we already have this object, and it's the same type, then update the
    // existing one in place.
    let existing = this._objects.get(object.name);
    if (existing && existing.constructor.name === object.constructor.name) {
      for(let prop in object) existing[prop] = object[prop];
      object = existing;
    }
    // if a geometrically equivalent object exists, do nothing.
    else if(existing = this.find(object)) {
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

    return this;
  }
  
  get(name) {
    return this._objects.get(name);
  }
  
  point(name, x, y) {
    if(typeof y === 'undefined') {
      y = x;
      x = name;
      name = null;
    }
    return this.add(new Point(name, x, y));
  }
  
  circle(name, centerId, boundaryId) {
    if(typeof boundaryId === 'undefined') {
      boundaryId = centerId;
      centerId = name;
      name = null;
    }
    return this.add(new Circle(name, this.get(centerId), this.get(boundaryId)));
  }
  
  segment(name, id1, id2) {
    if(typeof id2 === 'undefined') {
      id2 = id1;
      id1 = name;
      name = null;
    }
    return this.add(new Segment(name, this.get(id1), this.get(id2)));
  }
  
  line(name, id1, id2) {
    if(typeof id2 === 'undefined') {
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
      intersections: this._intersections.keys()
    }
    this.log.push(state);
  }
}

module.exports = Scene;
