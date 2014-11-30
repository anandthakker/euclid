
let {P, Circle, Line, Segment} = require('./lib/geometry'),
    sweep = require('./lib/sweepline'),
    renderer = require('./lib/render-canvas'),
    {intersect} = require('./lib/intersection'),
    sharpCanvas = require('./lib/sharp-canvas');

function init() {
  let canvas = sharpCanvas(document.querySelector('canvas'));
  let ctx = canvas.getContext('2d')
  let render = renderer(ctx)

  
  
  let objects = [];
  
  objects.push(new Circle(P(300,500),300));
  objects.push(new Circle(P(650,300),200));
  objects.push(new Line(P(300, 200), P(600, 500)));
  objects.push(new Segment(P(400, 500), P(700, 200)));
  
  render(objects);
  
  let finite = objects.map(obj=>
    (obj instanceof Line) ? Segment.clip(canvas.getBoundingClientRect(), obj) : obj);
  let intersections = [];
  for(let i = 0; i < finite.length; i++) {
    for(let j = i+1; j < finite.length; j++) {
      let isect = intersect(finite[i], finite[j]);
      Array.prototype.push.apply(intersections, isect)
    }
  }
  
  intersections.forEach(render);
}

document.addEventListener('DOMContentLoaded', init)
