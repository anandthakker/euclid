
let {P, Circle} = require('./lib/geometry'),
    sweep = require('./lib/sweepline'),
    renderer = require('./lib/render-canvas'),
    {intersectCircleCircle} = require('./lib/intersection');

function init() {
  let canvas = document.querySelector('canvas')
  let ctx = canvas.getContext('2d')
  let render = renderer(ctx)
  
  let objects = [];
  
  let w = canvas.getBoundingClientRect().width;
  let h = canvas.getBoundingClientRect().height;
  objects.push(new Circle(P(300,500),300));
  objects.push(new Circle(P(650,300),200));
  
  render(objects);
  
  let isect = intersectCircleCircle(objects[0], objects[1]);
  render(isect);
  // sweep(canvas.getBoundingClientRect(), 10, objects, render);
}

document.addEventListener('DOMContentLoaded', init)
