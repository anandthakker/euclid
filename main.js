
let d3 = require('d3');

let {P, Circle, Line, Segment} = require('./lib/geometry'),
    sweep = require('./lib/sweepline'),
    render = require('./lib/render-d3-svg'),
    {intersect} = require('./lib/intersection');

function init() {
  let svg = document.querySelector('svg');
  
  let {x: left, y: top, width, height} = svg.viewBox.baseVal;
  let bounds = { left, top, width, height, right: left+width, bottom: top+height };
  
  
  let objects = [];
  
  objects.push(new Circle(P(300,500),300));
  objects.push(new Circle(P(650,300),200));
  objects.push(new Line(P(200, 100), P(700, 600)));
  objects.push(new Segment(P(400, 500), P(700, 200)));
  
  function intersections(objects) {
    let finite = objects.map(obj=>
      (obj instanceof Line) ? Segment.clip(bounds, obj) : obj);
    let intersections = [];
    for(let i = 0; i < finite.length; i++) {
      for(let j = i+1; j < finite.length; j++) {
        let isect = intersect(finite[i], finite[j]);
        Array.prototype.push.apply(intersections, isect)
      }
    }
    return intersections;
  }
  
  let update = render(svg, onDrag);
  
  function onDrag(d) {
    d.x = Math.max(5, Math.min(bounds.width - 5, d3.event.x))
    d.y = Math.max(5, Math.min(bounds.height - 5, d3.event.y))
    // console.log(d);
    // d3.select(this)
    // .attr("cx", d.x = Math.max(5, Math.min(bounds.width - 5, d3.event.x)))
    // .attr("cy", d.y = Math.max(5, Math.min(bounds.height - 5, d3.event.y)));
    update(objects.concat(intersections(objects)));
  }
  
  update(objects.concat(intersections(objects)));
}

document.addEventListener('DOMContentLoaded', init)
