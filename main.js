
let d3 = require('d3');

let Set = require('./lib/set'),
    {P, Circle, Line, Segment} = require('./lib/geometry'),
    Scene = require('./lib/scene'),
    renderer = require('./lib/render-d3-svg');
    
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
   * the scene
   */
  
  scene.add(P(width/5*2, height/2));
  scene.add(P(width/5*3, height/2));
  scene.add(new Circle(scene.P(0), scene.P(1)));
  scene.add(new Circle(scene.P(1), scene.P(0)));
  scene.add(new Circle(scene.P(2), scene.P(1)));


  /* 
   * render
   */
   
  function update() {
    scene.updateIntersections();
    render();
    console.log(scene);
  }
  
  update();
  
  /* 
   * interaction
   */
   
  function translate(p) {
    p.x += d3.event.dx;
    p.y += d3.event.dy;
  }
  
  let pointdrag = d3.behavior.drag()
  .on('drag', function(d) {
    d.x = Math.max(5, Math.min(scene.bounds.width - 5, d3.event.x))
    d.y = Math.max(5, Math.min(scene.bounds.height - 5, d3.event.y))
    update();
  });
  d3.selectAll('.free-point').call(pointdrag);
  
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
    update();
  })
  d3.selectAll('.circle').call(circledrag);
  
  
  let linedrag = d3.behavior.drag()
  .on('drag', function(d) {
    d._p.forEach(translate);
    update();
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
