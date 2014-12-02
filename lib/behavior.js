

function translate(p) {
  p.x += d3.event.dx;
  p.y += d3.event.dy;
}


function point(update) {
  return d3.behavior.drag()
  .on('drag', function(d) {
    d.x = d3.event.x;
    d.y = d3.event.y;
    update();
  });
}

function circle(update) {
  return d3.behavior.drag()
  .on('drag', function(d) {
    if(d.boundaryPoint) {
      if(d.boundaryPoint.free && d.center.free) {
        translate(d.center);
        translate(d.boundaryPoint);
      }
      else { return; }
    }
    else {
      let dx = d.center.x - d3.event.x;
      let dy = d.center.y - d3.event.y;
      d.radius = Math.sqrt(dx*dx + dy*dy);
    }
    update();
  })
}
  
function line(update) {
  return d3.behavior.drag()
  .on('drag', function(d) {
    if(d._p.some(p=>!p.free)) { return; }
    d._p.forEach(translate); // TODO: avoid accessing private _p....
    update();
  })
}  


module.exports = {
  move: { circle, line, point }
}
