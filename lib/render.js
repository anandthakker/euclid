
let d3 = require('d3')
let { Point, Circle, Segment, Line } = require('./model')

module.exports = renderer;

function renderer(scene, svgElement) {
  let svg = d3.select(svgElement);

  function point() {
    this.attr('class', klasses('point') )
    .attr('cx', d=>d.x)
    .attr('cy', d=>d.y)
    .attr('r', d=>5)
    return this;
  }
  
  function klasses() {
    let init = Array.prototype.slice.call(arguments, 0);
    return d => init.concat(d.classes ? d.classes.values() : []).join(' ');
  }
  
  function render() {
    /* circles */
    let circles = svg.selectAll('g.circle')
    .data(scene.objects().filter(d => d instanceof Circle));

    let circleGroup = circles.enter().append('g')
    .attr('class', klasses('circle'))
    .call(hover);
    circleGroup.append('circle').attr('class', 'handle');
    circleGroup.append('circle').attr('class', 'visible');

    circles
    .attr('class', klasses('circle'))
    .selectAll('circle')
    .attr('cx', d => d.center.x)
    .attr('cy', d => d.center.y)
    .attr('r', d => d.radius)
    
    circles.exit().remove();
    
    /* lines */
    let lines = svg.selectAll('g.line')
    .data(scene.objects().filter(d=>d instanceof Line));
    
    let lineGroup = lines.enter().append('g')
    .attr('class', klasses('line'))
    .call(hover);
    lineGroup.filter(d=>d instanceof Segment)
    .attr('class', klasses('line', 'segment'))
    lineGroup.append('line').attr('class', 'handle');
    lineGroup.append('line').attr('class', 'visible');
    
    // TODO: this is grossly inefficient
    function endpoint(index, coord) {
      return d=>{
        let s = d instanceof Segment ? d : Segment.clip(scene.bounds, d);
        return s.p[index][coord];
      }
    }
      
    lines
    .attr('class', klasses('line'))
    .selectAll('line')
    .attr('x1', endpoint(0,'x'))
    .attr('y1', endpoint(0,'y'))
    .attr('x2', endpoint(1,'x'))
    .attr('y2', endpoint(1,'y'))
    
    lines.exit().remove();
    
    /* points */
    let points = svg.selectAll('circle.point')
    .data(scene.objects().filter(d=>d instanceof Point))
    .sort((a,b)=>(a.free ? 1 : 0) - (b.free ? 1 : 0))
    points.enter().append('circle')
    points.call(point)
    .call(hover);
    
    points.exit().remove();
    

    /* attach "active" class on hover */
    function mouseover() { d3.select(this).classed('active', true); }
    function mouseout() { d3.select(this).classed('active', false); }
    function hover() {
      this.on('mouseover', mouseover).on('mouseout', mouseout);
      return this;
    }    
  }

  return render;
}
