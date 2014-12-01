
let d3 = require('d3')
let { Point, Circle, Segment, Line } = require('./geometry')

module.exports = renderer;

function renderer(svgElement) {
  let svg = d3.select(svgElement);

  function point() {
    this.attr('class', klasses('point') )
    .attr('cx', d=>d.x)
    .attr('cy', d=>d.y)
    .attr('r', d=>5)
  }
  
  function klasses() {
    let init = Array.prototype.slice.call(arguments, 0);
    return d => init.concat(d.classes ? d.classes.values() : []).join(' ');
  }
  
  function render(objects) {
    let {x: left, y: top, width, height} = svg.property('viewBox').baseVal;
    let bounds = { left, top, width, height, right: left+width, bottom: top+height };

    /* circles */
    let circles = svg.selectAll('circle.circle')
    .data(objects.filter(d => d instanceof Circle));

    circles.enter().append('circle')
    .attr('class', klasses('circle'));

    circles.attr('cx', d => d.center.x)
    .attr('cy', d => d.center.y)
    .attr('r', d => d.radius);
    
    circles.exit().remove();
    
    /* lines */
    let lines = svg.selectAll('line.line')
    .data(objects
      .filter(d=>d instanceof Line)
      .map(d=>Segment.clip(bounds, d))
    );
    
    lines.enter().append('line')
    .attr('class', klasses('line'))
    .filter(d=>d instanceof Segment)
    .attr('class', klasses('line', 'segment'))
      
    lines.attr('x1', d=>d.p[0].x)
    .attr('y1', d=>d.p[0].y)
    .attr('x2', d=>d.p[1].x)
    .attr('y2', d=>d.p[1].y)
    
    lines.exit().remove();
    
    /* points */
    let points = svg.selectAll('circle.point')
    .data(objects.filter(d=>d instanceof Point))
    points.enter().append('circle')
    points.call(point)
    
    points.exit().remove();
  }

  return render;
}
