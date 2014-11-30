
module.exports = sharpCanvas;

function sharpCanvas(canvas) {
  let ctx = canvas.getContext('2d');

  /* see http://www.html5rocks.com/en/tutorials/canvas/hidpi/ */
  let devicePixelRatio = window.devicePixelRatio || 1,
    backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1,
    ratio = devicePixelRatio / backingStoreRatio;
  
  if(devicePixelRatio !== backingStoreRatio) {
    var oldWidth = canvas.width;
    var oldHeight = canvas.height;
    
    canvas.width = oldWidth * ratio;
    canvas.height = oldHeight * ratio;
    
    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';
    
    // now scale the context to counter
    // the fact that we've manually scaled
    // our canvas element
    ctx.scale(ratio, ratio);
  }
  
  return canvas;
}
