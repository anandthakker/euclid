
let d3 = require('d3');

let {P, Circle, Line, Segment} = require('./lib/geometry'),
    Scene = require('./lib/scene'),
    renderer = require('./lib/render'),
    behavior = require('./lib/behavior');
    
function init() {
  let svg = document.querySelector('svg');
  let {x: left, y: top, width, height} = svg.viewBox.baseVal;
  let scene = new Scene({
    width,
    height,
    left,
    top,
    right: left+width,
    bottom: top+height
  })
  let render = renderer(scene, svg);
  
  /* 
   * build the scene
   */
  
  scene
  .point(width/7*3, height/2)
  .point(width/7*4, height/2)
  .circle(0, 1)
  .circle(1, 0)
  .circle(2, 1)
  .circle(4, 2);
  
  /* 
   * render
   */
   
  function update() {
    scene.updateIntersections();
    render();
  }
  
  update();
  
  /* 
   * interaction
   */
   
  d3.selectAll('.free-point').call(behavior.move.point(update));
  d3.selectAll('.circle').call(behavior.move.circle(update));
  d3.selectAll('.line').call(behavior.move.line(update));
}

document.addEventListener('DOMContentLoaded', init)
