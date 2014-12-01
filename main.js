
let {P, Circle, Line, Segment} = require('./lib/geometry'),
    sweep = require('./lib/sweepline'),
    render = require('./lib/render-d3-svg'),
    {intersect} = require('./lib/intersection');

function init() {
  let svg = document.querySelector('svg');
  
  let {x: left, y: top, width, height} = svg.viewBox.baseVal;
  let bounds = { left, top, width, height, right: left+width, bottom: top+height };
  console.log(bounds);
  
  let objects = [];
  
  objects.push(new Circle(P(300,500),300));
  objects.push(new Circle(P(650,300),200));
  objects.push(new Line(P(200, 100), P(700, 600)));
  objects.push(new Segment(P(400, 500), P(700, 200)));
  
  let finite = objects.map(obj=>
    (obj instanceof Line) ? Segment.clip(bounds, obj) : obj);
  let intersections = [];
  for(let i = 0; i < finite.length; i++) {
    for(let j = i+1; j < finite.length; j++) {
      let isect = intersect(finite[i], finite[j]);
      Array.prototype.push.apply(objects, isect)
    }
  }
  
  console.log(svg);
  render(svg, objects);
}

document.addEventListener('DOMContentLoaded', init)
