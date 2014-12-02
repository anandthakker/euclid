
let d3 = require('d3');

let Set = require('./lib/set'),
    {P, Circle, Line, Segment} = require('./lib/geometry'),
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
  
  scene.add(P(width/7*3, height/2));
  scene.add(P(width/7*4, height/2));
  scene.add(new Circle(scene.P(0), scene.P(1)));
  scene.add(new Circle(scene.P(1), scene.P(0)));
  scene.add(new Circle(scene.P(2), scene.P(1)));
  scene.add(new Segment(scene.P(0), scene.P(1)));
  scene.add(new Segment(scene.P(1), scene.P(2)));
  scene.add(new Segment(scene.P(2), scene.P(0)));
  scene.add(new Segment(scene.P(4), scene.P(1)));
  scene.add(new Segment(scene.P(5), scene.P(0)));
  // scene.add(new Line(scene.P(3), scene.P(4)));
  // scene.add(new Line(scene.P(4), scene.P(5)));
  // scene.add(new Line(scene.P(5), scene.P(3)));
  
  /* 
   * render
   */
   
  function update() {
    scene.updateIntersections();
    render();
    console.log(scene.intersections());
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
