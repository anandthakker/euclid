
let { P, Point, Circle, Segment, Line } = require('./geometry')

let _ = require('lodash');

module.exports = sweep;

class Intersection extends Point {
  constructor(x, y, curves) {
    super(x,y);
    this.curves = curves;
  }
}

function sweep(bounds, dx, objects, render) {
  
  /*
  TODO: This is a *very* naive implementation. 
  Make it actually efficient by:
  1. using enter and leave "events" instead of calculating y at every sweep.
  2. using a decent data structure
  */
  
  let sweepline = {
    x: bounds.left,
    hits: [],
    insert(y, object, key) {
      if(this.contains(key)) { return; }
      let i = _.sortedIndex(this.hits, {y}, 'y');
      this.hits.splice(i, 0, {object, key, y});
    },
    contains: (key)=>_.find(sweepline.hits, {key})
  }
  
  for(let x = bounds.left; x <= bounds.right; x += dx) {
    render(new Line(P(x,0), P(x,10)))
    
    objects.forEach(function(obj, objIndex) {
      let y = obj.y(x);
      if(!y) { return; }
      let yvalues = Array.isArray(y) ? y : [y];
      yvalues.forEach(function(y, yIndex) {
        // this assumes that obj.y() returns y values in the same order each time.
        sweepline.insert(y, obj, objIndex+':'+yIndex)
        render(P(x, y));
      })
    })
    
    sweepline.hits.forEach(function({object, key, y}) {
    })
  }
}
    
