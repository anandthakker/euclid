
let { P, Point, Circle, Segment, Line } = require('./geometry')

let _ = require('lodash');

module.exports = sweep;

function Intersection(x, y, curves) {
  Point.call(this, x, y);
  this.curves = curves;
}
Intersection.prototype = Object.create(Point.prototype);
Intersection.prototype.constructor = Intersection;



function sweep(bounds, dx, objects, ctx) {
  
  let sweepline = {
    x: bounds.left,
    hits: [],
    insert: (y, object, key)=>{
      let i = _.sortedIndex(this.hits, {y}, 'y');
      this.hits.splice(i, 0, {object, key, y});
    }
  }
  
  for(let x = bounds.left; x <= bounds.right; x += dx) {
    
  }
}
    
