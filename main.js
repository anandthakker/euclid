
let {P, Circle} = require('./lib/geometry'),
    sweep = require('./lib/sweepline'),
    renderer = require('./lib/render-canvas')

function init() {
  let canvas = document.querySelector('canvas')
  let ctx = canvas.getContext('2d')
  let render = renderer(ctx)
  
  let objects = [];
  
  let w = canvas.getBoundingClientRect().width;
  let h = canvas.getBoundingClientRect().height;
  objects.push(new Circle(P(300,500),100));
  objects.push(new Circle(P(650,300),200));
  
  render(objects);
  
  sweep(canvas.getBoundingClientRect(), 10, objects, render);
}

document.addEventListener('DOMContentLoaded', init)
