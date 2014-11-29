
let { Point, Circle, Segment, Line } = require('./geometry')

module.exports = function(ctx, opts) {
  return function render(object) {
    console.log(object);
    if(Array.isArray(object)) {
      object.forEach(render);
    }
    if(object instanceof Point) {
      ctx.save();
      ctx.strokeStyle = '#880000';
      ctx.beginPath();
      ctx.arc(object.x, object.y, 5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    } else if(object instanceof Circle) {
      ctx.beginPath();
      ctx.arc(object.center.x, object.center.y, object.radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.closePath();
    } else if(object instanceof Segment) {
      ctx.beginPath();
      ctx.moveTo(object.p[0].x, object.p[0].y);
      ctx.lineTo(object.p[1].x, object.p[1].y);
      ctx.stroke();
      ctx.closePath();
    } else if(object instanceof Line) {
      render(object.clip(ctx.canvas.getBoundingClientRect()))
    }
  };
}
