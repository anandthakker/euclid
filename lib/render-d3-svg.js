
let d3 = require('d3')
let { Point, Circle, Segment, Line } = require('./geometry')

module.exports = render;

function render(svgElement, onDrag) {
  let {x: left, y: top, width, height} = svgElement.viewBox.baseVal;
  let bounds = { left, top, width, height, right: left+width, bottom: top+height };
  let svg = d3.select(svgElement);

  var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("drag", onDrag);
  
  function update(objects) {
    var c = svg.selectAll('circle.circle')
    .data(objects.filter(d=>d instanceof Circle))
    c.enter().append('circle').attr('class', 'circle')
    c.attr('cx', d=>d.center.x)
    .attr('cy', d=>d.center.y)
    .attr('r', d=>d.radius)
    
    let lines = objects.filter(d=>d instanceof Line).map(d=>Segment.clip(bounds, d));
    let s = svg.selectAll('line.line')
    .data(lines)
    s.enter().append('line').attr('class', 'line')
    s.attr('x1', d=>d.p[0].x)
    .attr('y1', d=>d.p[0].y)
    .attr('x2', d=>d.p[1].x)
    .attr('y2', d=>d.p[1].y)
    
    let p = svg.selectAll('circle.point')
    .data(objects.filter(d=>d instanceof Point))
    p.enter().append('circle').attr('class', 'point')
    p.attr('cx', d=>d.x)
    .attr('cy', d=>d.y)
    .attr('r', d=>5)
    
    
    /* control points */
    let controls = objects.reduce(function(result, obj) {
      if(obj instanceof Circle) {
        result.push(obj.center);
      } else if(obj instanceof Line) {
        Array.prototype.push.apply(result, obj._p); // TODO: don't reference private 
      }
      return result;
    }, [])
    let cont = svg.selectAll('circle.control-point')
    .data(controls)
    cont.enter().append('circle').attr('class', 'control-point')
    cont.attr('cx', d=>d.x)
    .attr('cy', d=>d.y)
    .attr('r', 5)
    .call(drag)
  }

  return update;
}
