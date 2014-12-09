

module.exports = {
  distance,
  distanceSquared
}

/* returns the Euclidean distance between (p1.x, p1.y) and (p2.x, p2.y) */
function distance(p1, p2) {
  return Math.sqrt(distanceSquared(p1, p2));
}

/* returns the squared Euclidean distance between (p1.x, p1.y) and (p2.x, p2.y) */
function distanceSquared(p1, p2) {
  let dx = p1.x - p2.x,
      dy = p1.y - p2.y;
  return dx*dx + dy*dy;
}
