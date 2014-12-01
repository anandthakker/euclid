
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
  
  let update = renderer(svg);
    
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
   * render
   */
  
  function render() {
    update(objects.concat(controlpoints(objects), intersections(objects)));
  }
  
  render();
  
  /* 
   * interaction
   */
   
  function translate(p) {
    p.x += d3.event.dx;
    p.y += d3.event.dy;
  }
  
  let pointdrag = d3.behavior.drag()
  .on('drag', function(d) {
    d.x = Math.max(5, Math.min(bounds.width - 5, d3.event.x))
    d.y = Math.max(5, Math.min(bounds.height - 5, d3.event.y))
    render();
  });
  d3.selectAll('.control-point').call(pointdrag);
  
  let circledrag = d3.behavior.drag()
  .on('drag', function(d) {
    if(d.boundaryPoint) {
      translate(d.center);
      translate(d.boundaryPoint);
    } 
    else {
      let dx = d.center.x - d3.event.x;
      let dy = d.center.y - d3.event.y;
      d.radius = Math.sqrt(dx*dx + dy*dy);
    }
    render();
  })
  d3.selectAll('.circle').call(circledrag);
  
  
  let linedrag = d3.behavior.drag()
  .on('drag', function(d) {
    d._p.forEach(translate);
    render();
  })
  d3.selectAll('.line').call(linedrag);
  
  function mouseover() { d3.select(this).classed('active', true); }
  function mouseout() { d3.select(this).classed('active', false); }
  function hover() {
    this.on('mouseover', mouseover)
    .on('mouseout', mouseout);
  }
  
  d3.selectAll('.circle').call(hover);
  d3.selectAll('.line').call(hover);
  
}

document.addEventListener('DOMContentLoaded', init)
