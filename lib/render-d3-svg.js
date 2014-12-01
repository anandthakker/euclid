
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
    let circles = svg.selectAll('g.circle')
    .data(objects.filter(d => d instanceof Circle));

    let circleGroup = circles.enter().append('g')
    .attr('class', klasses('circle'));
    circleGroup.append('circle').attr('class', 'handle');
    circleGroup.append('circle').attr('class', 'visible');

    circles.selectAll('circle')
    .attr('cx', d => d.center.x)
    .attr('cy', d => d.center.y)
    .attr('r', d => d.radius);
    
    circles.exit().remove();
    
    /* lines */
    let lines = svg.selectAll('g.line')
    .data(objects
      .filter(d=>d instanceof Line)
    );
    
    let lineGroup = lines.enter().append('g')
    .attr('class', klasses('line'))
    lineGroup.filter(d=>d instanceof Segment)
    .attr('class', klasses('line', 'segment'))
    lineGroup.append('line').attr('class', 'handle');
    lineGroup.append('line').attr('class', 'visible');
    
    // TODO: this is grossly inefficient
    function endpoint(index, coord) {
      return d=>{
        let s = d instanceof Segment ? d : Segment.clip(bounds, d);
        return s.p[index][coord];
      }
    }
      
    lines.selectAll('line')
    .attr('x1', endpoint(0,'x'))
    .attr('y1', endpoint(0,'y'))
    .attr('x2', endpoint(1,'x'))
    .attr('y2', endpoint(1,'y'))
    
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
