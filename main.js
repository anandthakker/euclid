
let d3 = require('d3');

let Set = require('./lib/set'),
    {P, Circle, Line, Segment} = require('./lib/geometry'),
    {intersect, Intersection} = require('./lib/intersection'),
    renderer = require('./lib/render-d3-svg');
    
function init() {
  let svg = document.querySelector('svg');
  let {x: left, y: top, width, height} = svg.viewBox.baseVal;
  let bounds = {
    width,
    height,
    left,
    top,
    right: left+width,
    bottom: top+height };
  
  let render = renderer(svg);
    
  function addClass(obj, klass) {
    obj.classes = obj.classes || new Set();
    obj.classes.add(klass);
  }
  
  
  /* 
   * the scene
   */
  
  let objects = [];
  
  objects.push(new Circle(P(300,500),100));
  objects.push(new Circle(P(650,300),P(650, 450)));
  objects.push(new Segment(objects[0].center, objects[1].center));
  objects.push(new Line(P(200, 100), P(700, 600)));
  
  function controlpoints(objects) {
    // grab circle centers, segment endpoints, and line defining points
    let res = objects.reduce( function(res, obj) {
      if(obj instanceof Circle)
        res.push(obj.center)
        if(obj.boundaryPoint) res.push(obj.boundaryPoint);
      else if(obj instanceof Line)
        res.push(obj._p[0], obj._p[1])
      return res;
    }, [])

    // add specific class
    res.forEach(p => addClass(p, 'control-point'));
    
    // filter out any control points that we're already drawing as part of
    // the scene.
    return res.filter(p => objects.indexOf(p) < 0 && !(p instanceof Intersection));
  }
  
  function intersections(objects) {
    let finite = objects.map(obj=>
      (obj instanceof Line) ? Segment.clip(bounds, obj) : obj);
    let intersections = [];
    for(let i = 0; i < finite.length; i++) {
      for(let j = i+1; j < finite.length; j++) {
        Array.prototype.push.apply(intersections, intersect(finite[i], finite[j]));
      }
    }
    intersections.forEach(function(p,i) {
      addClass(p, 'intersection-point');
    });
    return intersections;
  }


  /* 
   * initial render
   */
   
  render(objects.concat(controlpoints(objects), intersections(objects)));
  
  
  /* 
   * interaction
   */
  
  var drag = d3.behavior.drag()
  .origin(function(d) { return d; })
  .on("drag", onDrag);
  
  function onDrag(d) {
    console.log(d);
    d.x = Math.max(5, Math.min(bounds.width - 5, d3.event.x))
    d.y = Math.max(5, Math.min(bounds.height - 5, d3.event.y))
    render(objects.concat(controlpoints(objects), intersections(objects)));
  }
  
  d3.selectAll('.control-point').call(drag);
  
}

document.addEventListener('DOMContentLoaded', init)
