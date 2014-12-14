!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.geom=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports = {
  model: require("./lib/model"),
  intersection: require("./lib/intersection"),
  Scene: require("./lib/scene"),
  renderer: require("./lib/render"),
  behavior: require("./lib/behavior")
};

},{"./lib/behavior":2,"./lib/intersection":4,"./lib/model":5,"./lib/render":12,"./lib/scene":13}],2:[function(require,module,exports){
(function (global){
"use strict";

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

function translate(p) {
  p.x += d3.event.dx;
  p.y += d3.event.dy;
}


function point(update) {
  return d3.behavior.drag().on("drag", function (d) {
    d.x = d3.event.x;
    d.y = d3.event.y;
    update();
  });
}

function circle(update) {
  return d3.behavior.drag().on("drag", function (d) {
    if (d.boundaryPoint) {
      if (d.boundaryPoint.free && d.center.free) {
        translate(d.center);
        translate(d.boundaryPoint);
      } else {
        return;
      }
    } else {
      var dx = d.center.x - d3.event.x;
      var dy = d.center.y - d3.event.y;
      d.radius = Math.sqrt(dx * dx + dy * dy);
    }
    update();
  });
}

function line(update) {
  return d3.behavior.drag().on("drag", function (d) {
    if (d._p.some(function (p) {
      return !p.free;
    })) {
      return;
    }
    d._p.forEach(translate); // TODO: avoid accessing private _p....
    update();
  });
}

function follow(svg, point, update) {
  var following = false;
  var mousex = point.x;
  var mousey = point.y;
  d3.select("body").on("mousemove", function () {
    var _temp, _ref;
    ((_temp = d3.mouse(svg), _ref = _toArray(_temp), mousex = _ref[0], mousey = _ref[1], _temp));
    if (!following) step();
  });
  function step() {
    var dx = (mousex - point.x), dy = (mousey - point.y), dsq = dx * dx + dy * dy, d = Math.sqrt(dsq);

    if (d > 10) {
      following = true;
      point.x += dx / d;
      point.y += dy / d;
      update();
      window.requestAnimationFrame(step);
    } else {
      following = false;
    }
  }
}


module.exports = {
  move: { circle: circle, line: line, point: point },
  follow: follow
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
"use strict";

module.exports = {
  distance: distance,
  distanceSquared: distanceSquared
};

/* returns the Euclidean distance between (p1.x, p1.y) and (p2.x, p2.y) */
function distance(p1, p2) {
  return Math.sqrt(distanceSquared(p1, p2));
}

/* returns the squared Euclidean distance between (p1.x, p1.y) and (p2.x, p2.y) */
function distanceSquared(p1, p2) {
  var dx = p1.x - p2.x, dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

},{}],4:[function(require,module,exports){
"use strict";

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var uniq = require("uniq");

var _ref = require("./model");

var Point = _ref.Point;
var Line = _ref.Line;
var Segment = _ref.Segment;
var Circle = _ref.Circle;
var P = Point.P;
var dd = require("./calc").distanceSquared;


/* helpers */
function comparePoints(p, q) {
  return (p.x === q.x && p.y === q.y) ? 0 : 1;
}
function sq(a) {
  return a * a;
}

/*
  Intersection of two objects; returns an array, possibly empty, of 
  intersection points.
*/

/**
 * intersect - Find the intersection(s) of the given two objects.
 *  
 * @param  {Geom} o1 first object 
 * @param  {Geom} o2 second object 
 * @return {Array.<Point>}    Points of intersection between the two objects. 
 */
function intersect(o1, o2) {
  if (o1 instanceof Circle && o2 instanceof Circle) // circle-circle
    return intersectCircleCircle(o1, o2);else if (o2 instanceof Circle) // if only one is a circle, it should be first.
    return intersect(o2, o1);else if (o1 instanceof Circle && o2 instanceof Line) // circle-line(or segment)
    return intersectCircleLine(o1, o2);else if (o1 instanceof Segment && o2 instanceof Segment) // segment-segment
    return intersectLineLine(o1, o2, true);else if (o2 instanceof Segment) // if only one is a segment, it should be first.
    return intersect(o2, o1);else if (o1 instanceof Line && o2 instanceof Line) return intersectLineLine(o1, o2, false);

  // TODO: circle-point, segment-point, point-point
  else if (o2 instanceof Point || o1 instanceof Point) return [];else throw new Error("Cannot intersect " + o1.constructor.name + " and " + o2.constructor.name);
}

function intersectCircleCircle(c1, c2) {
  var dsq = dd(c1.center, c2.center);
  var d = Math.sqrt(dsq);

  if (d > c1.radius + c2.radius) {
    return [];
  } else if (d < c1.radius - c2.radius) {
    return [];
  } else if (dsq === 0) {
    return [];
  }

  var a = (c1.radiussq - c2.radiussq + dsq) / (2 * d);
  var h = Math.sqrt(Math.max(c1.radiussq - sq(a), 0));
  var cx = c1.center.x + a * (c2.center.x - c1.center.x) / d;
  var cy = c1.center.y + a * (c2.center.y - c1.center.y) / d;

  var nx = h * (c1.center.y - c2.center.y) / d;
  var ny = h * (c1.center.x - c2.center.x) / d;

  return uniq([P(0, cx + nx, cy - ny), P(1, cx - nx, cy + ny)], comparePoints);
}

function intersectLineLine(s1, s2, clip) {
  var _ref2 = _toArray(s1._p);

  var x1 = _ref2[0].x;
  var y1 = _ref2[0].y;
  var x2 = _ref2[1].x;
  var y2 = _ref2[1].y;
  var _ref3 = _toArray(s2._p);

  var x3 = _ref3[0].x;
  var y3 = _ref3[0].y;
  var x4 = _ref3[1].x;
  var y4 = _ref3[1].y;
  var s = (-s1.dy * (x1 - x3) + s1.dx * (y1 - y3)) / (-s2.dx * s1.dy + s1.dx * s2.dy);
  var t = (s2.dx * (y1 - y3) - s2.dy * (x1 - x3)) / (-s2.dx * s1.dy + s1.dx * s2.dy);

  if (!clip || (s >= 0 && s <= 1 && t >= 0 && t <= 1)) return [P(0, x1 + t * s1.dx, y1 + t * s1.dy)];else return []; // no collision
}

/* http://mathworld.wolfram.com/Circle-LineIntersection.html */
function intersectCircleLine(c, s) {
  var _ref4 = _toArray(s._p);

  var x1 = _ref4[0].x;
  var y1 = _ref4[0].y;
  var x2 = _ref4[1].x;
  var y2 = _ref4[1].y;
  var x0 = c.center.x;
  var y0 = c.center.y;


  // note the translation (x0, y0)->(0,0).
  var D = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  var Dsq = sq(D);

  var lensq = sq(s.dx) + sq(s.dy);
  var disc = Math.sqrt(sq(c.radius) * lensq - Dsq);
  if (disc < 0) {
    return [];
  }

  var cx = D * s.dy / lensq, cy = -D * s.dx / lensq;
  var nx = (s.dy < 0 ? -1 * s.dx : s.dx) * disc / lensq, ny = Math.abs(s.dy) * disc / lensq;


  // translate (0,0)->(x0, y0).
  return uniq([P(0, cx + nx + x0, cy + ny + y0), P(1, cx - nx + x0, cy - ny + y0)], comparePoints)

  // TODO: reinstate this after addressing https://github.com/anandthakker/euclid/issues/1
  //  .filter(s.contains.bind(s)); // filter out points not defined on segment
  ;
}


module.exports = {
  intersect: intersect,
  intersectCircleCircle: intersectCircleCircle,
  intersectCircleLine: intersectCircleLine,
  intersectLineLine: intersectLineLine };

},{"./calc":3,"./model":5,"uniq":14}],5:[function(require,module,exports){
"use strict";

var Point = require("./model/point"), Circle = require("./model/circle"), Line = require("./model/line"), Segment = require("./model/segment");

module.exports = {
  P: Point.P,
  Point: Point,
  Circle: Circle,
  Segment: Segment,
  Line: Line,
  equalWithin: equalWithin
};


/* return a deep-equality test function that checks for geometric object
   equality using the given distance threshold for point equality; i.e., if 
   two points are closer than `threshold`, consider them equal. */
function equalWithin(threshold) {
  threshold = threshold || 0;
  return function equal(o1, o2) {
    if (Array.isArray(o1) && Array.isArray(o2)) {
      return o1.every(function (obj, index) {
        return equal(obj, o2[index]);
      });
    }
    if (typeof o1 === "number" && typeof o2 === "number") {
      return Math.abs(o1 - o2) < threshold;
    }
    if (o1 instanceof Point && o2 instanceof Point) {
      // return equal(new Segment(o1, o2).length, 0);
      // taxicab distance -- faster?
      return equal(Math.abs(o1.x - o2.x) + Math.abs(o1.y - o2.y), 0);
    }
    if (o1 instanceof Circle && o2 instanceof Circle) {
      return equal(o1.radius, o2.radius) && equal(o1.center, o2.center);
    }
    if (o1 instanceof Segment && o2 instanceof Segment) {
      var p1 = [].concat(o1.p), p2 = [].concat(o2.p);
      // ensure points from both segments are in the same order
      // (left to right or right to left).
      if (p1[0].x > p1[1].x && p2[0].x < p2[0].x) p1.reverse();
      // then delegate to point equality
      return equal(p1, p2);
    }
    if (o1 instanceof Line && o2 instanceof Line) {
      return equal(o1.m, o2.m) && equal(o1.y(0), o2.y(0)) && equal(o1.x(0), o2.x(0));
    }

    // fallback to object equality
    return o1 === o2;
  };
}

},{"./model/circle":6,"./model/line":9,"./model/point":10,"./model/segment":11}],6:[function(require,module,exports){
"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var Geom = require("./geom");

var Point = require("./point");

var Segment = require("./segment");

var _ref = require("../calc");

var distance = _ref.distance;
var distanceSquared = _ref.distanceSquared;
var Circle = (function (Geom) {
  var Circle = function Circle(name, center, a) {
    Geom.call(this, name);
    this.center = center;
    if (a instanceof Point) {
      this._fromCenterAndBoundaryPoint(center, a);
    } else if (typeof a === "number") {
      this._fromCenterAndRadius(center, a);
    }
  };

  _extends(Circle, Geom);

  Circle.prototype._fromCenterAndRadius = function (center, radius) {
    this.radius = radius;
    Object.defineProperties(this, {
      radiussq: {
        get: function () {
          return this.radius * this.radius;
        }
      }
    });
  };

  Circle.prototype._fromCenterAndBoundaryPoint = function (center, boundaryPoint) {
    this.boundaryPoint = boundaryPoint;
    Object.defineProperties(this, {
      radius: {
        get: function () {
          return distance(this.boundaryPoint, this.center);
        }
      },
      radiussq: {
        get: function () {
          return distanceSquared(this.boundaryPoint, this.center);
        }
      }
    });
  };

  Circle.prototype.y = function (x) {
    var w = Math.abs(x - this.center.x);
    if (w > this.radius) return null;
    if (w === this.radius) return new Point(x, this.center.y);

    var h = Math.sqrt(this.radius * this.radius - w * w);
    return [this.center.y + h, this.center.y - h];
  };

  Circle.prototype.contains = function (p) {
    return distanceSquared(p, this.center) === this.radiussq;
  };

  Circle.prototype.toString = function () {
    return "Circle" + Geom.prototype.toString.call(this) + "[" + this.center.toString() + ";" + this.radius + "]";
  };

  return Circle;
})(Geom);

module.exports = Circle;

},{"../calc":3,"./geom":7,"./point":10,"./segment":11}],7:[function(require,module,exports){
"use strict";

module.exports = (function () {
  var Geom = function Geom(name) {
    this.name = name;
  };

  Geom.prototype.toString = function () {
    return this.name;
  };

  return Geom;
})();

},{}],8:[function(require,module,exports){
"use strict";

var _slice = Array.prototype.slice;
var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var Point = require("./point");

var _ref = require("../intersection");

var intersect = _ref.intersect;


module.exports = (function (Point) {
  var Intersection =


  /**  
   * @param {string} name
   * @param {...Geom} objects to be intersected
   * @param {number|Geom~boolean} [which] optional array index or filter callback in case there are multiple intersections.
   */
  function Intersection(name) {
    var objects = _slice.call(arguments, 1);

    Point.call(this, name, null, null);

    this.which = /function|number/.test(typeof objects[objects.length - 1]) ? objects.pop() : 0;
    this.objects = objects;
    this.free = false;
  };

  _extends(Intersection, Point);

  Intersection.prototype.update = function () {
    var result = intersect.apply(null, this.objects);
    if (typeof this.which === "function") result = result.filter(this.which)[0];else result = result[this.which];

    if (result) {
      var _temp;
      ((_temp = result, this.x = _temp.x, this.y = _temp.y, _temp));
    } else {
      this.x = this.y = null;
    }
  };

  Intersection.prototype.toString = function (verbose) {
    var pstr = Point.prototype.toString.call(this);
    return (!verbose) ? pstr : pstr + "; intersection of: " + this.objects.map(function (o) {
      return o.toString();
    }).join(",");
  };

  return Intersection;
})(Point);

},{"../intersection":4,"./point":10}],9:[function(require,module,exports){
"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var Geom = require("./geom");

var Line = (function (Geom) {
  var Line = function Line(name, p1, p2) {
    Geom.call(this, name);
    if (!p2) {
      this._p = p1.slice(0);
    } else {
      this._p = [p1, p2];
    }

    this._clip = false;

    Object.defineProperties(this, {
      // TODO: I don't like dx and dy on the line class...
      dx: {
        get: function () {
          return this._p[1].x - this._p[0].x;
        }
      },
      dy: {
        get: function () {
          return this._p[1].y - this._p[0].y;
        }
      },
      theta: {
        get: function () {
          return Math.atan2(this.dy, this.dx);
        }
      },
      m: {
        get: function () {
          if (this.dx === 0) return null;else return this.dy / this.dx;
        }
      },

      left: {
        get: function () {
          return this._clip ? Math.min(this._p[0].x, this._p[1].x) : null;
        }
      },
      right: {
        get: function () {
          return this._clip ? Math.max(this._p[0].x, this._p[1].x) : null;
        }
      },
      top: {
        get: function () {
          return this._clip ? Math.min(this._p[0].y, this._p[1].y) : null;
        }
      },
      bottom: {
        get: function () {
          return this._clip ? Math.max(this._p[0].y, this._p[1].y) : null;
        }
      }

    });
  };

  _extends(Line, Geom);

  Line.prototype.y = function (x) {
    if ((this.dx === 0) || (this._clip && (this.left > x || this.right < x))) return null;else return this._p[0].y + (x - this._p[0].x) * (this.dy) / (this.dx);
  };

  Line.prototype.x = function (y) {
    if ((this.dy === 0) || (this._clip && (this.top > y || this.bottom < y))) return null;else return this._p[0].x + (y - this._p[0].y) * (this.dx) / (this.dy);
  };

  Line.prototype.contains = function (p) {
    var onLine = (this.dx !== 0) ? (this.y(p.x) === p.y) : (this.x(p.y) === p.x);
    return onLine && (!this._clip || ((this.left <= p.x && p.x <= this.right) && (this.top <= p.y && p.y <= this.bottom)));
  };

  Line.prototype.toString = function () {
    return "Line" + Geom.prototype.toString.call(this) + "[" + this._p[0].toString() + ";" + this._p[1].toString() + "]";
  };

  return Line;
})(Geom);

module.exports = Line;

},{"./geom":7}],10:[function(require,module,exports){
"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var Geom = require("./geom");

module.exports = (function (Geom) {
  var Point = function Point(name, x, y) {
    Geom.call(this, name);
    this.x = x;
    this.y = y;
    this.free = true;
  };

  _extends(Point, Geom);

  Point.prototype.toString = function () {
    return Geom.prototype.toString.call(this) + "(" + this.x + "," + this.y + ")";
  };

  Point.P = function (name, x, y) {
    if (!y) {
      y = x;
      x = name;
      name = null;
    }
    return new Point(null, x, y);
  };

  return Point;
})(Geom);

},{"./geom":7}],11:[function(require,module,exports){
"use strict";

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var P = require("./point").P;
var Line = require("./line");

var _ref = require("../calc");

var distanceSquared = _ref.distanceSquared;
var distance = _ref.distance;
var Segment = (function (Line) {
  var Segment = function Segment(name, p1, p2) {
    Line.call(this, name, p1, p2);
    this._clip = true;

    Object.defineProperties(this, {
      p: {
        // TODO: clone point themselves?
        get: function () {
          return [].concat(this._p);
        }
      },

      lengthsq: {
        get: function () {
          return distanceSquared(this._p[0], this._p[1]);
        }
      },

      length: {
        get: function () {
          return distance(this._p[0], this._p[1]);
        }
      }
    });
  };

  _extends(Segment, Line);

  Segment.prototype.toString = function () {
    return "Segment" + Line.prototype.toString.call(this);
  };

  Segment.clip = function (bounds, line) {
    var _ref2 = _toArray(line._p);

    var p1 = _ref2[0];
    var p2 = _ref2[1];


    var left = line.y(bounds.left), right = line.y(bounds.right), top = line.x(bounds.top), bottom = line.x(bounds.bottom);

    if (p1.x > p2.x) {
      var t = p1;
      p1 = p2;
      p2 = t;
    }
    if (left && left >= bounds.top && left <= bounds.bottom) {
      // intersects left wall
      p1 = P(bounds.left, left);
    }
    if (right && right >= bounds.top && right <= bounds.bottom) {
      // intersects right wall
      p2 = P(bounds.right, right);
    }

    if (p1.y > p2.y) {
      var t = p1;
      p1 = p2;
      p2 = t;
    }
    if (top && top >= bounds.left && top <= bounds.right) {
      // intersects top wall
      p1 = P(top, bounds.top);
    }
    if (bottom && bottom >= bounds.left && bottom <= bounds.right) {
      // intersects bottom wall
      p2 = P(bottom, bounds.bottom);
    }

    var clipped = new Segment(null, p1, p2);
    clipped.parent = line;
    return clipped;
  };

  return Segment;
})(Line);




module.exports = Segment;

},{"../calc":3,"./line":9,"./point":10}],12:[function(require,module,exports){
(function (global){
"use strict";

var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);
var _ref = require("./model");

var Point = _ref.Point;
var Circle = _ref.Circle;
var Segment = _ref.Segment;
var Line = _ref.Line;


module.exports = renderer;

function renderer(scene, svgElement) {
  var svg = d3.select(svgElement);

  function point() {
    this.attr("class", klasses("point")).attr("cx", function (d) {
      return d.x;
    }).attr("cy", function (d) {
      return d.y;
    }).attr("r", function (d) {
      return 5;
    });
    return this;
  }

  function klasses() {
    var init = Array.prototype.slice.call(arguments, 0);
    return function (d) {
      return init.concat(d.classes ? d.classes.values() : []).join(" ");
    };
  }

  function render() {
    /* circles */
    var circles = svg.selectAll("g.circle").data(scene.objects().filter(function (d) {
      return d instanceof Circle;
    }));

    var circleGroup = circles.enter().append("g").attr("class", klasses("circle")).call(hover);
    circleGroup.append("circle").attr("class", "handle");
    circleGroup.append("circle").attr("class", "visible");

    circles.attr("class", klasses("circle")).selectAll("circle").attr("cx", function (d) {
      return d.center.x;
    }).attr("cy", function (d) {
      return d.center.y;
    }).attr("r", function (d) {
      return d.radius;
    });

    circles.exit().remove();

    /* lines */
    var lines = svg.selectAll("g.line").data(scene.objects().filter(function (d) {
      return d instanceof Line;
    }));

    var lineGroup = lines.enter().append("g").attr("class", klasses("line")).call(hover);
    lineGroup.filter(function (d) {
      return d instanceof Segment;
    }).attr("class", klasses("line", "segment"));
    lineGroup.append("line").attr("class", "handle");
    lineGroup.append("line").attr("class", "visible");

    // TODO: this is grossly inefficient
    function endpoint(index, coord) {
      return function (d) {
        var s = d instanceof Segment ? d : Segment.clip(scene.bounds, d);
        return s.p[index][coord];
      };
    }

    lines.attr("class", klasses("line")).selectAll("line").attr("x1", endpoint(0, "x")).attr("y1", endpoint(0, "y")).attr("x2", endpoint(1, "x")).attr("y2", endpoint(1, "y"));

    lines.exit().remove();

    /* points */
    var points = svg.selectAll("circle.point").data(scene.objects().filter(function (d) {
      return d instanceof Point;
    })).sort(function (a, b) {
      return (a.free ? 1 : 0) - (b.free ? 1 : 0);
    });
    points.enter().append("circle");
    points.call(point).call(hover);

    points.exit().remove();


    /* attach "active" class on hover */
    function mouseover() {
      d3.select(this).classed("active", true);
    }
    function mouseout() {
      d3.select(this).classed("active", false);
    }
    function hover() {
      this.on("mouseover", mouseover).on("mouseout", mouseout);
      return this;
    }
  }

  return render;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./model":5}],13:[function(require,module,exports){
(function (global){
"use strict";

var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

var _ref = require("./model");

var Point = _ref.Point;
var Line = _ref.Line;
var Segment = _ref.Segment;
var Circle = _ref.Circle;
var equalWithin = _ref.equalWithin;
var Intersection = require("./model/intersection");




function addClass(obj, klass) {
  obj.classes = obj.classes || d3.set();
  obj.classes.add(klass);
}

var Scene = (function () {
  var Scene = function Scene(bounds) {
    this.bounds = bounds;
    this.bounds.width = this.bounds.right - this.bounds.left;
    this.bounds.height = this.bounds.bottom - this.bounds.top;

    this._last = null; // hack -- should be keeping objects in ordered structure anyway.
    this._objects = d3.map();
    this._intersections = d3.map();
    this.equal = equalWithin(Math.sqrt(2));
    this.log = [];
  };

  Scene.prototype.points = function () {
    return this._objects.values().filter(function (o) {
      return o instanceof Point;
    });
  };

  Scene.prototype.objects = function () {
    return this._objects.values();
  };

  Scene.prototype.find = function (obj) {
    var _objects = this._objects.values();
    for (var i = 0; i < _objects.length; i++) {
      if (this.equal(_objects[i], obj)) return _objects[i];
    }
    return null;
  };

  Scene.prototype.is = function (obj) {
    var _this = this;
    if (typeof obj === "string") {
      obj = this.get(obj);
    }
    return function (secondObj) {
      return (obj && _this.equal(obj, secondObj));
    };
  };

  Scene.prototype.isnt = function (obj) {
    var _this2 = this;
    if (typeof obj === "string") {
      obj = this.get(obj);
    }
    return function (secondObj) {
      return (obj && !_this2.equal(obj, secondObj));
    };
  };

  Scene.prototype.freeName = function () {
    // TODO: this is gonna get weird if we go above 26.
    var max = "A".charCodeAt(0) - 1, keys = this._objects.keys();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].length === 1) max = Math.max(keys[i].charCodeAt(0), max);
    }
    return String.fromCharCode(max + 1);
  };

  Scene.prototype.add = function (object) {
    // if we already have this object, and it's the same type, then update the
    // existing one in place.
    var existing = this._objects.get(object.name);
    if (existing && existing.constructor.name === object.constructor.name) {
      for (var prop in object) {
        existing[prop] = object[prop];
      }object = existing;
    }
    // if a geometrically equivalent object exists, do nothing.
    else if (existing = this.find(object)) {
      console.log("Tried to add " + object + " but " + existing + " is already in scene.");
      return this;
    }
    // add a new object to the scene.
    else {
      object.name = object.name || this.freeName();
      this._objects.set(object.name, object);
    }

    if (this._currentTag) addClass(object, this._currentTag);
    if (object.free) addClass(object, "free-point");

    this.update(object);

    this._last = object;
    return this;
  };

  Scene.prototype.last = function () {
    return this._last;
  };

  Scene.prototype.get = function (name) {
    return this._objects.get(name);
  };

  Scene.prototype.point = function (name, x, y) {
    if (typeof y === "undefined") {
      y = x;
      x = name;
      name = null;
    }
    return this.add(new Point(name, x, y));
  };

  Scene.prototype.circle = function (name, centerId, boundaryId) {
    if (typeof boundaryId === "undefined") {
      boundaryId = centerId;
      centerId = name;
      name = null;
    }
    return this.add(new Circle(name, this.get(centerId), this.get(boundaryId)));
  };

  Scene.prototype.segment = function (name, id1, id2) {
    if (typeof id2 === "undefined") {
      id2 = id1;
      id1 = name;
      name = null;
    }
    return this.add(new Segment(name, this.get(id1), this.get(id2)));
  };

  Scene.prototype.line = function (name, id1, id2) {
    if (typeof id2 === "undefined") {
      id2 = id1;
      id1 = name;
      name = null;
    }
    return this.add(new Line(name, this.get(id1), this.get(id2)));
  };

  Scene.prototype.intersection = function (name, id1, id2, which) {
    if (typeof id2 === "undefined") {
      id2 = id1;
      id1 = name;
      name = null;
    }

    var o1 = this.get(id1), o2 = this.get(id2);
    if (!o1) throw new Error("Can't find object " + id1);
    if (!o2) throw new Error("Can't find object " + id2);

    return this.add(new Intersection(name, o1, o2, which));
  };

  Scene.prototype.group = function (tag) {
    this._currentTag = tag;
    return this;
  };

  Scene.prototype.update = function (root) {
    this._objects.values().filter(function (obj) {
      return obj instanceof Intersection;
    }).forEach(function (obj) {
      return obj.update();
    });
  };

  Scene.prototype.logState = function (label) {
    var self = this;
    var _objects2 = this._objects.values();
    var _points = this.points();

    var state = {
      label: label,
      time: (new Date()).toString(),
      objects: _objects2.map(function (o) {
        return o.toString();
      }),
      intersections: this._intersections.keys()
    };
    this.log.push(state);
  };

  return Scene;
})();

module.exports = Scene;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./model":5,"./model/intersection":8}],14:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvYmVoYXZpb3IuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvY2FsYy5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9pbnRlcnNlY3Rpb24uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvY2lyY2xlLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2dlb20uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvaW50ZXJzZWN0aW9uLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2xpbmUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvcG9pbnQuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvc2VnbWVudC5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9yZW5kZXIuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvc2NlbmUuanMiLCJub2RlX21vZHVsZXMvdW5pcS91bmlxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNDQSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXZCLFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRTtBQUNwQixHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQ25CLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Q0FDcEI7OztBQUdELFNBQVMsS0FBSyxDQUFD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LFNBQVMscUJBQXFCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxNQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkMsTUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFdkIsTUFBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFO0FBQUUsV0FBTyxFQUFFLENBQUM7R0FBRSxNQUN2QyxJQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUU7QUFBRSxXQUFPLEVBQUUsQ0FBQztHQUFFLE1BQzVDLElBQUcsR0FBRyxLQUFLLENBQUMsRUFBRTtBQUFFLFdBQU8sRUFBRSxDQUFDO0dBQUU7O0FBRWpDLE1BQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xELE1BQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BELE1BQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3ZELE1BQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxD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UUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLFFBQUksU0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDckMsUUFBSSxPQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDOztBQUUzQixRQUFJLEtBQUssR0FBRztBQUNWLFdBQUssRUFBTCxLQUFLO0FBQ0wsVUFBSSxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRTtBQUM3QixhQUFPLEVBQUUsU0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7ZUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFO09BQUEsQ0FBQztBQUN2QyxtQkFBYSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFO0tBQzFDLENBQUE7QUFDRCxRQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUN0Qjs7U0F6TEcsS0FBSzs7O0FBNExYLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDOzs7OztBQzdNdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG52YXIgZDMgPSByZXF1aXJlKCdkMycpO1xuXG5mdW5jdGlvbiB0cmFuc2xhdGUocCkge1xuICBwLnggKz0gZDMuZXZlbnQuZHg7XG4gIHAueSArPSBkMy5ldmVudC5keTtcbn1cblxuXG5mdW5jdGlvbiBwb2ludCh1cGRhdGUpIHtcbiAgcmV0dXJuIGQzLmJlaGF2aW9yLmRyYWcoKVxuICAub24oJ2RyYWcnLCBmdW5jdGlvbihkKSB7XG4gICAgZC54ID0gZDMuZXZlbnQueDtcbiAgICBkLnkgPSBkMy5ldmVudC55O1xuICAgIHVwZGF0ZSgpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2lyY2xlKHVwZGF0ZSkge1xuICByZXR1cm4gZDMuYmVoYXZpb3IuZHJhZygpXG4gIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICBpZihkLmJvdW5kYXJ5UG9pbnQpIHtcbiAgICAgIGlmKGQuYm91bmRhcnlQb2ludC5mcmVlICYmIGQuY2VudGVyLmZyZWUpIHtcbiAgICAgICAgdHJhbnNsYXRlKGQuY2VudGVyKTtcbiAgICAgICAgdHJhbnNsYXRlKGQuYm91bmRhcnlQb2ludCk7XG4gICAgICB9XG4gICAgICBlbHNlIHsgcmV0dXJuOyB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbGV0IGR4ID0gZC5jZW50ZXIueCAtIGQzLmV2ZW50Lng7XG4gICAgICBsZXQgZHkgPSBkLmNlbnRlci55IC0gZDMuZXZlbnQueTtcbiAgICAgIGQucmFkaXVzID0gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpO1xuICAgIH1cbiAgICB1cGRhdGUoKTtcbiAgfSlcbn1cbiAgXG5mdW5jdGlvbiBsaW5lKHVwZGF0ZSkge1xuICByZXR1cm4gZDMuYmVoYXZpb3IuZHJhZygpXG4gIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICBpZihkLl9wLnNvbWUocD0+IXAuZnJlZSkpIHsgcmV0dXJuOyB9XG4gICAgZC5fcC5mb3JFYWNoKHRyYW5zbGF0ZSk7IC8vIFRPRE86IGF2b2lkIGFjY2Vzc2luZyBwcml2YXRlIF9wLi4uLlxuICAgIHVwZGF0ZSgpO1xuICB9KVxufVxuXG5mdW5jdGlvbiBmb2xsb3coc3ZnLCBwb2ludCwgdXBkYXRlKSB7XG4gIGxldCBmb2xsb3dpbmcgPSBmYWxzZTtcbiAgbGV0IHt4OiBtb3VzZXgsIHk6IG1vdXNleX0gPSBwb2ludDtcbiAgZDMuc2VsZWN0KCdib2R5Jykub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKCkge1xuICAgIChbbW91c2V4LCBtb3VzZXldID0gZDMubW91c2Uoc3ZnKSk7XG4gICAgaWYoIWZvbGxvd2luZykgc3RlcCgpO1xuICB9KTtcbiAgZnVuY3Rpb24gc3RlcCgpIHtcbiAgICBsZXQgZHggPSAobW91c2V4IC0gcG9pbnQueCksXG4gICAgICBkeSA9IChtb3VzZXkgLSBwb2ludC55KSxcbiAgICAgIGRzcSA9IGR4KmR4ICsgZHkqZHksXG4gICAgICBkID0gTWF0aC5zcXJ0KGRzcSk7XG4gICAgXG4gICAgaWYoZCA+IDEwKSB7XG4gICAgICBmb2xsb3dpbmcgPSB0cnVlO1xuICAgICAgcG9pbnQueCArPSBkeC9kO1xuICAgICAgcG9pbnQueSArPSBkeS9kO1xuICAgICAgdXBkYXRlKCk7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvbGxvd2luZyA9IGZhbHNlO1xuICAgIH1cbiAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtb3ZlOiB7IGNpcmNsZSwgbGluZSwgcG9pbnQgfSxcbiAgZm9sbG93XG59XG4iLCJcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRpc3RhbmNlLFxuICBkaXN0YW5jZVNxdWFyZWRcbn1cblxuLyogcmV0dXJucyB0aGUgRXVjbGlkZWFuIGRpc3RhbmNlIGJldHdlZW4gKHAxLngsIHAxLnkpIGFuZCAocDIueCwgcDIueSkgKi9cbmZ1bmN0aW9uIGRpc3RhbmNlKHAxLCBwMikge1xuICByZXR1cm4gTWF0aC5zcXJ0KGRpc3RhbmNlU3F1YXJlZChwMSwgcDIpKTtcbn1cblxuLyogcmV0dXJucyB0aGUgc3F1YXJlZCBFdWNsaWRlYW4gZGlzdGFuY2UgYmV0d2VlbiAocDEueCwgcDEueSkgYW5kIChwMi54LCBwMi55KSAqL1xuZnVuY3Rpb24gZGlzdGFuY2VTcXVhcmVkKHAxLCBwMikge1xuICBsZXQgZHggPSBwMS54IC0gcDIueCxcbiAgICAgIGR5ID0gcDEueSAtIHAyLnk7XG4gIHJldHVybiBkeCpkeCArIGR5KmR5O1xufVxuIiwiXG5sZXQgdW5pcSA9IHJlcXVpcmUoJ3VuaXEnKTtcblxubGV0IHtQb2ludCwgTGluZSwgU2VnbWVudCwgQ2lyY2xlfSA9IHJlcXVpcmUoJy4vbW9kZWwnKSxcbiAgICBQID0gUG9pbnQuUCxcbiAgICBkZCA9IHJlcXVpcmUoJy4vY2FsYycpLmRpc3RhbmNlU3F1YXJlZDtcblxuLyogaGVscGVycyAqL1xuZnVuY3Rpb24gY29tcGFyZVBvaW50cyhwLCBxKSB7IHJldHVybiAocC54ID09PSBxLnggJiYgcC55ID09PSBxLnkpID8gMCA6IDE7IH1cbmZ1bmN0aW9uIHNxKGEpIHsgcmV0dXJuIGEqYTsgfVxuXG4vKlxuICBJbnRlcnNlY3Rpb24gb2YgdHdvIG9iamVjdHM7IHJldHVybnMgYW4gYXJyYXksIHBvc3NpYmx5IGVtcHR5LCBvZiBcbiAgaW50ZXJzZWN0aW9uIHBvaW50cy5cbiovXG5cbi8qKlxuICogaW50ZXJzZWN0IC0gRmluZCB0aGUgaW50ZXJzZWN0aW9uKHMpIG9mIHRoZSBnaXZlbiB0d28gb2JqZWN0cy5cbiAqICBcbiAqIEBwYXJhbSAge0dlb219IG8xIGZpcnN0IG9iamVjdCBcbiAqIEBwYXJhbSAge0dlb219IG8yIHNlY29uZCBvYmplY3QgXG4gKiBAcmV0dXJuIHtBcnJheS48UG9pbnQ+fSAgICBQb2ludHMgb2YgaW50ZXJzZWN0aW9uIGJldHdlZW4gdGhlIHR3byBvYmplY3RzLiBcbiAqLyBcbmZ1bmN0aW9uIGludGVyc2VjdChvMSwgbzIpIHtcbiAgaWYobzEgaW5zdGFuY2VvZiBDaXJjbGUgJiYgbzIgaW5zdGFuY2VvZiBDaXJjbGUpIC8vIGNpcmNsZS1jaXJjbGVcbiAgICByZXR1cm4gaW50ZXJzZWN0Q2lyY2xlQ2lyY2xlKG8xLCBvMik7XG4gIGVsc2UgaWYobzIgaW5zdGFuY2VvZiBDaXJjbGUpIC8vIGlmIG9ubHkgb25lIGlzIGEgY2lyY2xlLCBpdCBzaG91bGQgYmUgZmlyc3QuXG4gICAgcmV0dXJuIGludGVyc2VjdChvMiwgbzEpOyBcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIExpbmUpIC8vIGNpcmNsZS1saW5lKG9yIHNlZ21lbnQpXG4gICAgcmV0dXJuIGludGVyc2VjdENpcmNsZUxpbmUobzEsIG8yKTtcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIFNlZ21lbnQgJiYgbzIgaW5zdGFuY2VvZiBTZWdtZW50KSAvLyBzZWdtZW50LXNlZ21lbnRcbiAgICByZXR1cm4gaW50ZXJzZWN0TGluZUxpbmUobzEsIG8yLCB0cnVlKTtcbiAgZWxzZSBpZihvMiBpbnN0YW5jZW9mIFNlZ21lbnQpIC8vIGlmIG9ubHkgb25lIGlzIGEgc2VnbWVudCwgaXQgc2hvdWxkIGJlIGZpcnN0LlxuICAgIHJldHVybiBpbnRlcnNlY3QobzIsIG8xKTtcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIExpbmUgJiYgbzIgaW5zdGFuY2VvZiBMaW5lKVxuICAgIHJldHVybiBpbnRlcnNlY3RMaW5lTGluZShvMSwgbzIsIGZhbHNlKTtcblxuICAvLyBUT0RPOiBjaXJjbGUtcG9pbnQsIHNlZ21lbnQtcG9pbnQsIHBvaW50LXBvaW50XG4gIGVsc2UgaWYobzIgaW5zdGFuY2VvZiBQb2ludCB8fCBvMSBpbnN0YW5jZW9mIFBvaW50KVxuICAgIHJldHVybiBbXTtcbiAgICBcbiAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnRlcnNlY3QgJyArIFxuICAgIG8xLmNvbnN0cnVjdG9yLm5hbWUgKyAnIGFuZCAnICsgbzIuY29uc3RydWN0b3IubmFtZSk7XG4gIFxufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RDaXJjbGVDaXJjbGUoYzEsIGMyKSB7XG4gIGxldCBkc3EgPSBkZChjMS5jZW50ZXIsIGMyLmNlbnRlcik7XG4gIGxldCBkID0gTWF0aC5zcXJ0KGRzcSk7XG4gIFxuICBpZihkID4gYzEucmFkaXVzICsgYzIucmFkaXVzKSB7IHJldHVybiBbXTsgfVxuICBlbHNlIGlmKGQgPCBjMS5yYWRpdXMgLSBjMi5yYWRpdXMpIHsgcmV0dXJuIFtdOyB9XG4gIGVsc2UgaWYoZHNxID09PSAwKSB7IHJldHVybiBbXTsgfVxuICAgIFxuICBsZXQgYSA9IChjMS5yYWRpdXNzcSAtIGMyLnJhZGl1c3NxICsgZHNxKSAvICgyKmQpO1xuICBsZXQgaCA9IE1hdGguc3FydChNYXRoLm1heChjMS5yYWRpdXNzcSAtIHNxKGEpLCAwKSk7XG4gIGxldCBjeCA9IGMxLmNlbnRlci54ICsgYSooYzIuY2VudGVyLnggLSBjMS5jZW50ZXIueCkvZDtcbiAgbGV0IGN5ID0gYzEuY2VudGVyLnkgKyBhKihjMi5jZW50ZXIueSAtIGMxLmNlbnRlci55KS9kO1xuICBcbiAgbGV0IG54ID0gaCAqIChjMS5jZW50ZXIueSAtIGMyLmNlbnRlci55KS9kO1xuICBsZXQgbnkgPSBoICogKGMxLmNlbnRlci54IC0gYzIuY2VudGVyLngpL2Q7XG4gIFxuICByZXR1cm4gdW5pcShbUCgwLCBjeCtueCwgY3ktbnkpLCBQKDEsIGN4LW54LCBjeStueSldLCBjb21wYXJlUG9pbnRzKTtcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0TGluZUxpbmUoczEsIHMyLCBjbGlwKSB7XG4gIGxldCBbe3g6eDEsIHk6eTF9LCB7eDp4MiwgeTp5Mn1dID0gczEuX3A7XG4gIGxldCBbe3g6eDMsIHk6eTN9LCB7eDp4NCwgeTp5NH1dID0gczIuX3A7XG4gIGxldCBzID0gKC1zMS5keSAqICh4MSAtIHgzKSArIHMxLmR4ICogKHkxIC0geTMpKSAvICgtczIuZHggKiBzMS5keSArIHMxLmR4ICogczIuZHkpXG4gIGxldCB0ID0gKHMyLmR4ICogKHkxIC0geTMpIC0gczIuZHkgKiAoeDEgLSB4MykpIC8gKC1zMi5keCAqIHMxLmR5ICsgczEuZHggKiBzMi5keSlcbiAgXG4gIGlmKCFjbGlwIHx8IChzID49IDAgJiYgcyA8PSAxICYmIHQgPj0gMCAmJiB0IDw9IDEpKVxuICAgIHJldHVybiBbUCgwLCB4MSArIHQqczEuZHgsIHkxICsgdCpzMS5keSldXG4gIGVsc2VcbiAgICByZXR1cm4gW107IC8vIG5vIGNvbGxpc2lvblxufVxuXG4vKiBodHRwOi8vbWF0aHdvcmxkLndvbGZyYW0uY29tL0NpcmNsZS1MaW5lSW50ZXJzZWN0aW9uLmh0bWwgKi9cbmZ1bmN0aW9uIGludGVyc2VjdENpcmNsZUxpbmUoYywgcykge1xuICBsZXQgW3t4OngxLCB5OnkxfSwge3g6eDIsIHk6eTJ9XSA9IHMuX3A7XG4gIGxldCB7eDp4MCwgeTp5MH0gPSBjLmNlbnRlcjtcblxuICAvLyBub3RlIHRoZSB0cmFuc2xhdGlvbiAoeDAsIHkwKS0+KDAsMCkuXG4gIGxldCBEID0gKHgxLXgwKSooeTIteTApIC0gKHgyLXgwKSooeTEteTApO1xuICBsZXQgRHNxID0gc3EoRCk7XG4gICAgXG4gIGxldCBsZW5zcSA9IHNxKHMuZHgpK3NxKHMuZHkpO1xuICBsZXQgZGlzYyA9IE1hdGguc3FydChzcShjLnJhZGl1cykqbGVuc3EgLSBEc3EpO1xuICBpZihkaXNjIDwgMCkgeyByZXR1cm4gW107IH1cblxuICBsZXQgY3ggPSBEKnMuZHkgLyBsZW5zcSwgY3kgPSAtRCpzLmR4IC8gbGVuc3E7XG4gIGxldCBueCA9IChzLmR5IDwgMCA/IC0xKnMuZHggOiBzLmR4KSAqIGRpc2MgLyBsZW5zcSxcbiAgICAgIG55ID0gTWF0aC5hYnMocy5keSkgKiBkaXNjIC8gbGVuc3E7XG5cblxuICAvLyB0cmFuc2xhdGUgKDAsMCktPih4MCwgeTApLlxuICByZXR1cm4gdW5pcShbUCgwLCBjeCArIG54ICsgeDAsIGN5ICsgbnkgKyB5MCksIFxuICAgICAgICAgICAgICAgIFAoMSwgY3ggLSBueCArIHgwLCBjeSAtIG55ICsgeTApXSwgY29tcGFyZVBvaW50cylcblxuICAgICAgICAvLyBUT0RPOiByZWluc3RhdGUgdGhpcyBhZnRlciBhZGRyZXNzaW5nIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmFuZHRoYWtrZXIvZXVjbGlkL2lzc3Vlcy8xXG4gICAgICAgIC8vICAuZmlsdGVyKHMuY29udGFpbnMuYmluZChzKSk7IC8vIGZpbHRlciBvdXQgcG9pbnRzIG5vdCBkZWZpbmVkIG9uIHNlZ21lbnRcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW50ZXJzZWN0LFxuICBpbnRlcnNlY3RDaXJjbGVDaXJjbGUsXG4gIGludGVyc2VjdENpcmNsZUxpbmUsXG4gIGludGVyc2VjdExpbmVMaW5lfVxuICBcbiIsIlxubGV0IFBvaW50ID0gcmVxdWlyZSgnLi9tb2RlbC9wb2ludCcpLFxuICAgIENpcmNsZSA9IHJlcXVpcmUoJy4vbW9kZWwvY2lyY2xlJyksXG4gICAgTGluZSA9IHJlcXVpcmUoJy4vbW9kZWwvbGluZScpLFxuICAgIFNlZ21lbnQgPSByZXF1aXJlKCcuL21vZGVsL3NlZ21lbnQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFA6IFBvaW50LlAsXG4gIFBvaW50LFxuICBDaXJjbGUsXG4gIFNlZ21lbnQsXG4gIExpbmUsXG4gIGVxdWFsV2l0aGluXG59O1xuXG5cbi8qIHJldHVybiBhIGRlZXAtZXF1YWxpdHkgdGVzdCBmdW5jdGlvbiB0aGF0IGNoZWNrcyBmb3IgZ2VvbWV0cmljIG9iamVjdFxuICAgZXF1YWxpdHkgdXNpbmcgdGhlIGdpdmVuIGRpc3RhbmNlIHRocmVzaG9sZCBmb3IgcG9pbnQgZXF1YWxpdHk7IGkuZS4sIGlmIFxuICAgdHdvIHBvaW50cyBhcmUgY2xvc2VyIHRoYW4gYHRocmVzaG9sZGAsIGNvbnNpZGVyIHRoZW0gZXF1YWwuICovXG5mdW5jdGlvbiBlcXVhbFdpdGhpbih0aHJlc2hvbGQpIHtcbiAgdGhyZXNob2xkID0gdGhyZXNob2xkIHx8IDA7XG4gIHJldHVybiBmdW5jdGlvbiBlcXVhbChvMSwgbzIpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvMSkgJiYgQXJyYXkuaXNBcnJheShvMikpIHtcbiAgICAgIHJldHVybiBvMS5ldmVyeSgob2JqLCBpbmRleCkgPT4gZXF1YWwob2JqLCBvMltpbmRleF0pKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIG8xID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgbzIgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gTWF0aC5hYnMobzEgLSBvMikgPCB0aHJlc2hvbGQ7XG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIFBvaW50ICYmIG8yIGluc3RhbmNlb2YgUG9pbnQpIHtcbiAgICAgIC8vIHJldHVybiBlcXVhbChuZXcgU2VnbWVudChvMSwgbzIpLmxlbmd0aCwgMCk7XG4gICAgICAvLyB0YXhpY2FiIGRpc3RhbmNlIC0tIGZhc3Rlcj9cbiAgICAgIHJldHVybiBlcXVhbChNYXRoLmFicyhvMS54IC0gbzIueCkgKyBNYXRoLmFicyhvMS55IC0gbzIueSksIDApO1xuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBDaXJjbGUgJiYgbzIgaW5zdGFuY2VvZiBDaXJjbGUpIHtcbiAgICAgIHJldHVybiBlcXVhbChvMS5yYWRpdXMsIG8yLnJhZGl1cykgJiYgZXF1YWwobzEuY2VudGVyLCBvMi5jZW50ZXIpO1xuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBTZWdtZW50ICYmIG8yIGluc3RhbmNlb2YgU2VnbWVudCkge1xuICAgICAgdmFyIHAxID0gW10uY29uY2F0KG8xLnApLFxuICAgICAgICAgIHAyID0gW10uY29uY2F0KG8yLnApXG4gICAgICAvLyBlbnN1cmUgcG9pbnRzIGZyb20gYm90aCBzZWdtZW50cyBhcmUgaW4gdGhlIHNhbWUgb3JkZXIgXG4gICAgICAvLyAobGVmdCB0byByaWdodCBvciByaWdodCB0byBsZWZ0KS5cbiAgICAgIGlmKHAxWzBdLnggPiBwMVsxXS54ICYmIHAyWzBdLnggPCBwMlswXS54KSBwMS5yZXZlcnNlKCk7XG4gICAgICAvLyB0aGVuIGRlbGVnYXRlIHRvIHBvaW50IGVxdWFsaXR5XG4gICAgICByZXR1cm4gZXF1YWwocDEsIHAyKVxuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBMaW5lICYmIG8yIGluc3RhbmNlb2YgTGluZSkge1xuICAgICAgcmV0dXJuIGVxdWFsKG8xLm0sIG8yLm0pICYmIGVxdWFsKG8xLnkoMCksIG8yLnkoMCkpICYmIGVxdWFsKG8xLngoMCksIG8yLngoMCkpO1xuICAgIH1cblxuICAgIC8vIGZhbGxiYWNrIHRvIG9iamVjdCBlcXVhbGl0eVxuICAgIHJldHVybiBvMSA9PT0gbzI7XG4gIH1cbn1cbiIsImxldCBHZW9tID0gcmVxdWlyZSgnLi9nZW9tJyksXG4gICAgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50JyksXG4gICAgU2VnbWVudCA9IHJlcXVpcmUoJy4vc2VnbWVudCcpLFxuICAgIHtkaXN0YW5jZSwgZGlzdGFuY2VTcXVhcmVkfSA9IHJlcXVpcmUoJy4uL2NhbGMnKTtcblxuY2xhc3MgQ2lyY2xlIGV4dGVuZHMgR2VvbSB7XG4gIFxuICBjb25zdHJ1Y3RvcihuYW1lLCBjZW50ZXIsIGEpIHtcbiAgICBzdXBlcihuYW1lKTtcbiAgICB0aGlzLmNlbnRlciA9IGNlbnRlcjtcbiAgICBpZiAoYSBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgICB0aGlzLl9mcm9tQ2VudGVyQW5kQm91bmRhcnlQb2ludChjZW50ZXIsIGEpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGEgPT09ICdudW1iZXInKSB7XG4gICAgICB0aGlzLl9mcm9tQ2VudGVyQW5kUmFkaXVzKGNlbnRlciwgYSk7XG4gICAgfVxuICB9XG4gIFxuICBfZnJvbUNlbnRlckFuZFJhZGl1cyhjZW50ZXIsIHJhZGl1cykge1xuICAgIHRoaXMucmFkaXVzID0gcmFkaXVzO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgIHJhZGl1c3NxOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yYWRpdXMgKiB0aGlzLnJhZGl1cztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIFxuICBfZnJvbUNlbnRlckFuZEJvdW5kYXJ5UG9pbnQoY2VudGVyLCBib3VuZGFyeVBvaW50KSB7XG4gICAgdGhpcy5ib3VuZGFyeVBvaW50ID0gYm91bmRhcnlQb2ludDtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICByYWRpdXM6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBkaXN0YW5jZSh0aGlzLmJvdW5kYXJ5UG9pbnQsIHRoaXMuY2VudGVyKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHJhZGl1c3NxOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gZGlzdGFuY2VTcXVhcmVkKHRoaXMuYm91bmRhcnlQb2ludCwgdGhpcy5jZW50ZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuICBcbiAgeSh4KSB7XG4gICAgdmFyIHcgPSBNYXRoLmFicyh4IC0gdGhpcy5jZW50ZXIueCk7XG4gICAgaWYgKHcgPiB0aGlzLnJhZGl1cykgcmV0dXJuIG51bGw7XG4gICAgaWYgKHcgPT09IHRoaXMucmFkaXVzKSByZXR1cm4gbmV3IFBvaW50KHgsIHRoaXMuY2VudGVyLnkpO1xuICAgIFxuICAgIHZhciBoID0gTWF0aC5zcXJ0KHRoaXMucmFkaXVzICogdGhpcy5yYWRpdXMgLSB3ICogdyk7XG4gICAgcmV0dXJuIFt0aGlzLmNlbnRlci55ICsgaCwgdGhpcy5jZW50ZXIueSAtIGhdO1xuICB9XG4gIFxuICBjb250YWlucyhwKSB7XG4gICAgcmV0dXJuIGRpc3RhbmNlU3F1YXJlZChwLCB0aGlzLmNlbnRlcikgPT09IHRoaXMucmFkaXVzc3E7XG4gIH1cbiAgXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnQ2lyY2xlJyArIHN1cGVyLnRvU3RyaW5nKCkgKyAnWycgKyB0aGlzLmNlbnRlci50b1N0cmluZygpICsgJzsnICsgdGhpcy5yYWRpdXMgKyAnXSc7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaXJjbGU7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEdlb20ge1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgfVxuICBcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgfVxufVxuIiwiXG5sZXQgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50JyksXG4gICAge2ludGVyc2VjdH0gPSByZXF1aXJlKCcuLi9pbnRlcnNlY3Rpb24nKTtcblxubW9kdWxlLmV4cG9ydHM9XG5jbGFzcyBJbnRlcnNlY3Rpb24gZXh0ZW5kcyBQb2ludCB7XG4gIFxuICBcbiAgLyoqICBcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsuLi5HZW9tfSBvYmplY3RzIHRvIGJlIGludGVyc2VjdGVkXG4gICAqIEBwYXJhbSB7bnVtYmVyfEdlb21+Ym9vbGVhbn0gW3doaWNoXSBvcHRpb25hbCBhcnJheSBpbmRleCBvciBmaWx0ZXIgY2FsbGJhY2sgaW4gY2FzZSB0aGVyZSBhcmUgbXVsdGlwbGUgaW50ZXJzZWN0aW9ucy5cbiAgICovICAgXG4gIGNvbnN0cnVjdG9yKG5hbWUsIC4uLm9iamVjdHMpIHtcbiAgICBzdXBlcihuYW1lLCBudWxsLCBudWxsKTtcbiAgICBcbiAgICB0aGlzLndoaWNoID0gL2Z1bmN0aW9ufG51bWJlci8udGVzdCh0eXBlb2Ygb2JqZWN0c1tvYmplY3RzLmxlbmd0aCAtIDFdKSA/XG4gICAgICBvYmplY3RzLnBvcCgpIDogMDtcbiAgICB0aGlzLm9iamVjdHMgPSBvYmplY3RzO1xuICAgIHRoaXMuZnJlZSA9IGZhbHNlO1xuICB9XG4gIFxuICB1cGRhdGUoKSB7XG4gICAgbGV0IHJlc3VsdCA9IGludGVyc2VjdC5hcHBseShudWxsLCB0aGlzLm9iamVjdHMpO1xuICAgIGlmKHR5cGVvZiB0aGlzLndoaWNoID09PSAnZnVuY3Rpb24nKVxuICAgICAgcmVzdWx0ID0gcmVzdWx0LmZpbHRlcih0aGlzLndoaWNoKVswXTtcbiAgICBlbHNlXG4gICAgICByZXN1bHQgPSByZXN1bHRbdGhpcy53aGljaF07XG4gICAgICBcbiAgICBpZihyZXN1bHQpIHtcbiAgICAgICh7eDogdGhpcy54LCB5OiB0aGlzLnl9ID0gcmVzdWx0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnggPSB0aGlzLnkgPSBudWxsO1xuICAgIH1cbiAgfVxuICBcbiAgdG9TdHJpbmcodmVyYm9zZSkge1xuICAgIGxldCBwc3RyID0gc3VwZXIudG9TdHJpbmcoKTtcbiAgICByZXR1cm4gKCF2ZXJib3NlKSA/IHBzdHIgOlxuICAgIHBzdHIgKyAnOyBpbnRlcnNlY3Rpb24gb2Y6ICcgKyB0aGlzLm9iamVjdHMubWFwKG8gPT4gby50b1N0cmluZygpKS5qb2luKCcsJyk7XG4gIH1cbn1cbiIsIlxubGV0IEdlb20gPSByZXF1aXJlKCcuL2dlb20nKTtcblxuY2xhc3MgTGluZSBleHRlbmRzIEdlb20ge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBwMSwgcDIpIHtcbiAgICBzdXBlcihuYW1lKTtcbiAgICBpZiAoIXAyKSB7XG4gICAgICB0aGlzLl9wID0gcDEuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcCA9IFtwMSwgcDJdO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLl9jbGlwID0gZmFsc2U7XG4gICAgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgLy8gVE9ETzogSSBkb24ndCBsaWtlIGR4IGFuZCBkeSBvbiB0aGUgbGluZSBjbGFzcy4uLlxuICAgICAgZHg6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl9wWzFdLnggLSB0aGlzLl9wWzBdLng7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBkeToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3BbMV0ueSAtIHRoaXMuX3BbMF0ueTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRoZXRhOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLmR5LCB0aGlzLmR4KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG06IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIGlmICh0aGlzLmR4ID09PSAwKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICBlbHNlIHJldHVybiB0aGlzLmR5IC8gdGhpcy5keDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgbGVmdDoge1xuICAgICAgICBnZXQoKSB7IHJldHVybiB0aGlzLl9jbGlwID8gTWF0aC5taW4odGhpcy5fcFswXS54LCB0aGlzLl9wWzFdLngpIDogbnVsbDsgfVxuICAgICAgfSxcbiAgICAgIHJpZ2h0OiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1heCh0aGlzLl9wWzBdLngsIHRoaXMuX3BbMV0ueCkgOiBudWxsOyB9XG4gICAgICB9LFxuICAgICAgdG9wOiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1pbih0aGlzLl9wWzBdLnksIHRoaXMuX3BbMV0ueSkgOiBudWxsOyB9XG4gICAgICB9LFxuICAgICAgYm90dG9tOiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1heCh0aGlzLl9wWzBdLnksIHRoaXMuX3BbMV0ueSkgOiBudWxsOyB9XG4gICAgICB9XG4gICAgICBcbiAgICB9KVxuICB9XG4gIFxuICB5KHgpIHtcbiAgICBpZiAoKHRoaXMuZHggPT09IDApIHx8ICh0aGlzLl9jbGlwICYmICh0aGlzLmxlZnQgPiB4IHx8IHRoaXMucmlnaHQgPCB4KSkpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBlbHNlIFxuICAgICAgcmV0dXJuIHRoaXMuX3BbMF0ueSArICh4IC0gdGhpcy5fcFswXS54KSAqICh0aGlzLmR5KSAvICh0aGlzLmR4KVxuICB9XG5cbiAgeCh5KSB7XG4gICAgaWYgKCh0aGlzLmR5ID09PSAwKSB8fCAodGhpcy5fY2xpcCAmJiAodGhpcy50b3AgPiB5IHx8IHRoaXMuYm90dG9tIDwgeSkpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZWxzZSBcbiAgICAgIHJldHVybiB0aGlzLl9wWzBdLnggKyAoeSAtIHRoaXMuX3BbMF0ueSkgKiAodGhpcy5keCkgLyAodGhpcy5keSlcbiAgfVxuICBcbiAgY29udGFpbnMocCkge1xuICAgIGxldCBvbkxpbmUgPSAodGhpcy5keCAhPT0gMCkgPyAodGhpcy55KHAueCkgPT09IHAueSkgOiAodGhpcy54KHAueSkgPT09IHAueCk7XG4gICAgcmV0dXJuIG9uTGluZSAmJiAoIXRoaXMuX2NsaXAgfHwgXG4gICAgICAoKHRoaXMubGVmdCA8PSBwLnggJiYgcC54IDw9IHRoaXMucmlnaHQpICYmXG4gICAgICAodGhpcy50b3AgPD0gcC55ICYmIHAueSA8PSB0aGlzLmJvdHRvbSkpKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnTGluZScgKyBzdXBlci50b1N0cmluZygpICsgJ1snICtcbiAgICAgIHRoaXMuX3BbMF0udG9TdHJpbmcoKSArICc7JyArIHRoaXMuX3BbMV0udG9TdHJpbmcoKSArXG4gICAgICAnXSc7XG4gIH1cbn1cbiAgICAgICAgXG5tb2R1bGUuZXhwb3J0cyA9IExpbmU7XG4iLCJsZXQgR2VvbSA9IHJlcXVpcmUoJy4vZ2VvbScpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUG9pbnQgZXh0ZW5kcyBHZW9tIHtcbiAgY29uc3RydWN0b3IobmFtZSwgeCwgeSkge1xuICAgIHN1cGVyKG5hbWUpO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLmZyZWUgPSB0cnVlO1xuICB9XG4gIFxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gc3VwZXIudG9TdHJpbmcoKSArICcoJyArIHRoaXMueCArICcsJyArIHRoaXMueSArICcpJztcbiAgfVxuICBcbiAgLyogc2hvcnRoYW5kIGZ1bmN0aW9uIGZvciBjb25zdHJ1Y3RpbmcgYSBwb2ludCBmcm9tIGNvb2RpbmF0ZXMgKi9cbiAgc3RhdGljIFAobmFtZSwgeCwgeSkge1xuICAgIGlmKCF5KSB7XG4gICAgICB5ID0geDtcbiAgICAgIHggPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUG9pbnQobnVsbCwgeCwgeSk7XG4gIH1cbn1cbiIsImxldCBQID0gcmVxdWlyZSgnLi9wb2ludCcpLlAsXG4gICAgTGluZSA9IHJlcXVpcmUoJy4vbGluZScpLFxuICAgIHtkaXN0YW5jZVNxdWFyZWQsIGRpc3RhbmNlfSA9IHJlcXVpcmUoJy4uL2NhbGMnKTtcblxuY2xhc3MgU2VnbWVudCBleHRlbmRzIExpbmUge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBwMSwgcDIpIHtcbiAgICBzdXBlcihuYW1lLCBwMSwgcDIpO1xuICAgIHRoaXMuX2NsaXAgPSB0cnVlO1xuICAgIFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgIHA6IHtcbiAgICAgICAgLy8gVE9ETzogY2xvbmUgcG9pbnQgdGhlbXNlbHZlcz9cbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBbXS5jb25jYXQodGhpcy5fcCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcbiAgICAgIGxlbmd0aHNxOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gZGlzdGFuY2VTcXVhcmVkKHRoaXMuX3BbMF0sIHRoaXMuX3BbMV0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXG4gICAgICBsZW5ndGg6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBkaXN0YW5jZSh0aGlzLl9wWzBdLCB0aGlzLl9wWzFdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cbiAgXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnU2VnbWVudCcgKyBzdXBlci50b1N0cmluZygpO1xuICB9XG4gIFxuICAvKlxuICBjbGlwIHRoZSBnaXZlbiBsaW5lIChvciBsaW5lIHNlZ21lbnQpIHRvIHRoZSBnaXZlbiBib3VuZGluZyBib3gsIHdoZXJlIGBib3VuZHNgXG4gIG11c3QgaGF2ZSBgbGVmdGAsIGByaWdodGAsIGB0b3BgLCBhbmQgYGJvdHRvbWAgcHJvcGVydGllcy5cbiAgKi9cbiAgc3RhdGljIGNsaXAoYm91bmRzLCBsaW5lKSB7XG4gICAgdmFyIFtwMSwgcDJdID0gbGluZS5fcDtcbiAgICBcbiAgICB2YXIgbGVmdCA9IGxpbmUueShib3VuZHMubGVmdCksXG4gICAgcmlnaHQgPSBsaW5lLnkoYm91bmRzLnJpZ2h0KSxcbiAgICB0b3AgPSBsaW5lLngoYm91bmRzLnRvcCksXG4gICAgYm90dG9tID0gbGluZS54KGJvdW5kcy5ib3R0b20pO1xuICAgIFxuICAgIGlmIChwMS54ID4gcDIueCkge1xuICAgICAgbGV0IHQgPSBwMTtcbiAgICAgIHAxID0gcDI7XG4gICAgICBwMiA9IHQ7XG4gICAgfVxuICAgIGlmIChsZWZ0ICYmIGxlZnQgPj0gYm91bmRzLnRvcCAmJiBsZWZ0IDw9IGJvdW5kcy5ib3R0b20pIHtcbiAgICAgIC8vIGludGVyc2VjdHMgbGVmdCB3YWxsXG4gICAgICBwMSA9IFAoYm91bmRzLmxlZnQsIGxlZnQpO1xuICAgIH1cbiAgICBpZiAocmlnaHQgJiYgcmlnaHQgPj0gYm91bmRzLnRvcCAmJiByaWdodCA8PSBib3VuZHMuYm90dG9tKSB7XG4gICAgICAvLyBpbnRlcnNlY3RzIHJpZ2h0IHdhbGxcbiAgICAgIHAyID0gUChib3VuZHMucmlnaHQsIHJpZ2h0KTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHAxLnkgPiBwMi55KSB7XG4gICAgICBsZXQgdCA9IHAxO1xuICAgICAgcDEgPSBwMjtcbiAgICAgIHAyID0gdDtcbiAgICB9XG4gICAgaWYgKHRvcCAmJiB0b3AgPj0gYm91bmRzLmxlZnQgJiYgdG9wIDw9IGJvdW5kcy5yaWdodCkge1xuICAgICAgLy8gaW50ZXJzZWN0cyB0b3Agd2FsbFxuICAgICAgcDEgPSBQKHRvcCwgYm91bmRzLnRvcCk7XG4gICAgfVxuICAgIGlmIChib3R0b20gJiYgYm90dG9tID49IGJvdW5kcy5sZWZ0ICYmIGJvdHRvbSA8PSBib3VuZHMucmlnaHQpIHtcbiAgICAgIC8vIGludGVyc2VjdHMgYm90dG9tIHdhbGxcbiAgICAgIHAyID0gUChib3R0b20sIGJvdW5kcy5ib3R0b20pO1xuICAgIH1cbiAgICBcbiAgICBsZXQgY2xpcHBlZCA9IG5ldyBTZWdtZW50KG51bGwsIHAxLCBwMik7XG4gICAgY2xpcHBlZC5wYXJlbnQgPSBsaW5lO1xuICAgIHJldHVybiBjbGlwcGVkO1xuICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTZWdtZW50O1xuIiwiXG5sZXQgZDMgPSByZXF1aXJlKCdkMycpXG5sZXQgeyBQb2ludCwgQ2lyY2xlLCBTZWdtZW50LCBMaW5lIH0gPSByZXF1aXJlKCcuL21vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXJlcjtcblxuZnVuY3Rpb24gcmVuZGVyZXIoc2NlbmUsIHN2Z0VsZW1lbnQpIHtcbiAgbGV0IHN2ZyA9IGQzLnNlbGVjdChzdmdFbGVtZW50KTtcblxuICBmdW5jdGlvbiBwb2ludCgpIHtcbiAgICB0aGlzLmF0dHIoJ2NsYXNzJywga2xhc3NlcygncG9pbnQnKSApXG4gICAgLmF0dHIoJ2N4JywgZD0+ZC54KVxuICAgIC5hdHRyKCdjeScsIGQ9PmQueSlcbiAgICAuYXR0cigncicsIGQ9PjUpXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGtsYXNzZXMoKSB7XG4gICAgbGV0IGluaXQgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIHJldHVybiBkID0+IGluaXQuY29uY2F0KGQuY2xhc3NlcyA/IGQuY2xhc3Nlcy52YWx1ZXMoKSA6IFtdKS5qb2luKCcgJyk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAvKiBjaXJjbGVzICovXG4gICAgbGV0IGNpcmNsZXMgPSBzdmcuc2VsZWN0QWxsKCdnLmNpcmNsZScpXG4gICAgLmRhdGEoc2NlbmUub2JqZWN0cygpLmZpbHRlcihkID0+IGQgaW5zdGFuY2VvZiBDaXJjbGUpKTtcblxuICAgIGxldCBjaXJjbGVHcm91cCA9IGNpcmNsZXMuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2NpcmNsZScpKVxuICAgIC5jYWxsKGhvdmVyKTtcbiAgICBjaXJjbGVHcm91cC5hcHBlbmQoJ2NpcmNsZScpLmF0dHIoJ2NsYXNzJywgJ2hhbmRsZScpO1xuICAgIGNpcmNsZUdyb3VwLmFwcGVuZCgnY2lyY2xlJykuYXR0cignY2xhc3MnLCAndmlzaWJsZScpO1xuXG4gICAgY2lyY2xlc1xuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2NpcmNsZScpKVxuICAgIC5zZWxlY3RBbGwoJ2NpcmNsZScpXG4gICAgLmF0dHIoJ2N4JywgZCA9PiBkLmNlbnRlci54KVxuICAgIC5hdHRyKCdjeScsIGQgPT4gZC5jZW50ZXIueSlcbiAgICAuYXR0cigncicsIGQgPT4gZC5yYWRpdXMpXG4gICAgXG4gICAgY2lyY2xlcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgXG4gICAgLyogbGluZXMgKi9cbiAgICBsZXQgbGluZXMgPSBzdmcuc2VsZWN0QWxsKCdnLmxpbmUnKVxuICAgIC5kYXRhKHNjZW5lLm9iamVjdHMoKS5maWx0ZXIoZD0+ZCBpbnN0YW5jZW9mIExpbmUpKTtcbiAgICBcbiAgICBsZXQgbGluZUdyb3VwID0gbGluZXMuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2xpbmUnKSlcbiAgICAuY2FsbChob3Zlcik7XG4gICAgbGluZUdyb3VwLmZpbHRlcihkPT5kIGluc3RhbmNlb2YgU2VnbWVudClcbiAgICAuYXR0cignY2xhc3MnLCBrbGFzc2VzKCdsaW5lJywgJ3NlZ21lbnQnKSlcbiAgICBsaW5lR3JvdXAuYXBwZW5kKCdsaW5lJykuYXR0cignY2xhc3MnLCAnaGFuZGxlJyk7XG4gICAgbGluZUdyb3VwLmFwcGVuZCgnbGluZScpLmF0dHIoJ2NsYXNzJywgJ3Zpc2libGUnKTtcbiAgICBcbiAgICAvLyBUT0RPOiB0aGlzIGlzIGdyb3NzbHkgaW5lZmZpY2llbnRcbiAgICBmdW5jdGlvbiBlbmRwb2ludChpbmRleCwgY29vcmQpIHtcbiAgICAgIHJldHVybiBkPT57XG4gICAgICAgIGxldCBzID0gZCBpbnN0YW5jZW9mIFNlZ21lbnQgPyBkIDogU2VnbWVudC5jbGlwKHNjZW5lLmJvdW5kcywgZCk7XG4gICAgICAgIHJldHVybiBzLnBbaW5kZXhdW2Nvb3JkXTtcbiAgICAgIH1cbiAgICB9XG4gICAgICBcbiAgICBsaW5lc1xuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2xpbmUnKSlcbiAgICAuc2VsZWN0QWxsKCdsaW5lJylcbiAgICAuYXR0cigneDEnLCBlbmRwb2ludCgwLCd4JykpXG4gICAgLmF0dHIoJ3kxJywgZW5kcG9pbnQoMCwneScpKVxuICAgIC5hdHRyKCd4MicsIGVuZHBvaW50KDEsJ3gnKSlcbiAgICAuYXR0cigneTInLCBlbmRwb2ludCgxLCd5JykpXG4gICAgXG4gICAgbGluZXMuZXhpdCgpLnJlbW92ZSgpO1xuICAgIFxuICAgIC8qIHBvaW50cyAqL1xuICAgIGxldCBwb2ludHMgPSBzdmcuc2VsZWN0QWxsKCdjaXJjbGUucG9pbnQnKVxuICAgIC5kYXRhKHNjZW5lLm9iamVjdHMoKS5maWx0ZXIoZD0+ZCBpbnN0YW5jZW9mIFBvaW50KSlcbiAgICAuc29ydCgoYSxiKT0+KGEuZnJlZSA/IDEgOiAwKSAtIChiLmZyZWUgPyAxIDogMCkpXG4gICAgcG9pbnRzLmVudGVyKCkuYXBwZW5kKCdjaXJjbGUnKVxuICAgIHBvaW50cy5jYWxsKHBvaW50KVxuICAgIC5jYWxsKGhvdmVyKTtcbiAgICBcbiAgICBwb2ludHMuZXhpdCgpLnJlbW92ZSgpO1xuICAgIFxuXG4gICAgLyogYXR0YWNoIFwiYWN0aXZlXCIgY2xhc3Mgb24gaG92ZXIgKi9cbiAgICBmdW5jdGlvbiBtb3VzZW92ZXIoKSB7IGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdhY3RpdmUnLCB0cnVlKTsgfVxuICAgIGZ1bmN0aW9uIG1vdXNlb3V0KCkgeyBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnYWN0aXZlJywgZmFsc2UpOyB9XG4gICAgZnVuY3Rpb24gaG92ZXIoKSB7XG4gICAgICB0aGlzLm9uKCdtb3VzZW92ZXInLCBtb3VzZW92ZXIpLm9uKCdtb3VzZW91dCcsIG1vdXNlb3V0KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gICAgXG4gIH1cblxuICByZXR1cm4gcmVuZGVyO1xufVxuIiwiXG5sZXQgZDMgPSByZXF1aXJlKCdkMycpLCAvLyBUT0RPOiByZW1vdmUgZGVwOyBvbmx5IGJlaW5nIHVzZWQgZm9yIGQzLm1hcCgpIGFuZCBkMy5zZXQoKS5cbiAgICB7XG4gICAgICBQb2ludCxcbiAgICAgIExpbmUsXG4gICAgICBTZWdtZW50LFxuICAgICAgQ2lyY2xlLFxuICAgICAgZXF1YWxXaXRoaW5cbiAgICB9ID0gcmVxdWlyZSgnLi9tb2RlbCcpLFxuICAgIEludGVyc2VjdGlvbiA9IHJlcXVpcmUoJy4vbW9kZWwvaW50ZXJzZWN0aW9uJyk7XG5cblxuZnVuY3Rpb24gYWRkQ2xhc3Mob2JqLCBrbGFzcykge1xuICBvYmouY2xhc3NlcyA9IG9iai5jbGFzc2VzIHx8IGQzLnNldCgpO1xuICBvYmouY2xhc3Nlcy5hZGQoa2xhc3MpO1xufVxuXG5jbGFzcyBTY2VuZSB7XG4gIFxuICBjb25zdHJ1Y3Rvcihib3VuZHMpIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmJvdW5kcy53aWR0aCA9IHRoaXMuYm91bmRzLnJpZ2h0IC0gdGhpcy5ib3VuZHMubGVmdDtcbiAgICB0aGlzLmJvdW5kcy5oZWlnaHQgPSB0aGlzLmJvdW5kcy5ib3R0b20gLSB0aGlzLmJvdW5kcy50b3A7XG5cbiAgICB0aGlzLl9sYXN0ID0gbnVsbDsgLy8gaGFjayAtLSBzaG91bGQgYmUga2VlcGluZyBvYmplY3RzIGluIG9yZGVyZWQgc3RydWN0dXJlIGFueXdheS5cbiAgICB0aGlzLl9vYmplY3RzID0gZDMubWFwKCk7XG4gICAgdGhpcy5faW50ZXJzZWN0aW9ucyA9IGQzLm1hcCgpO1xuICAgIHRoaXMuZXF1YWwgPSBlcXVhbFdpdGhpbihNYXRoLnNxcnQoMikpO1xuICAgIHRoaXMubG9nID0gW107XG4gIH1cbiAgXG4gIC8qIHJldHVybiBhbiBhcnJheSBvZiBhbGwgUG9pbnRzIGluIHRoZSBzY2VuZSAqL1xuICBwb2ludHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX29iamVjdHMudmFsdWVzKCkuZmlsdGVyKG8gPT4gbyBpbnN0YW5jZW9mIFBvaW50KVxuICB9XG4gIFxuICAvKiByZXR1cm4gYW4gYXJyYXkgb2YgYWxsIG9iamVjdHMgaW4gdGhlIHNjZW5lICovXG4gIG9iamVjdHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX29iamVjdHMudmFsdWVzKCk7XG4gIH1cbiAgXG4gIC8qIGZpbmQgdGhlIGdpdmVuIG9iamVjdCBpcyBpbiB0aGUgc2NlbmUgdXNpbmcgZ2VvbWV0cmljXG4gIChpLmUuIGRlZXApIGVxdWFsaXR5IHJhdGhlciB0aGFuIHJlZmVyZW5jZSA9PT0uICovXG4gIGZpbmQob2JqKSB7XG4gICAgbGV0IG9iamVjdHMgPSB0aGlzLl9vYmplY3RzLnZhbHVlcygpO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZih0aGlzLmVxdWFsKG9iamVjdHNbaV0sIG9iaikpIHJldHVybiBvYmplY3RzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBcbiAgLyoqICBcbiAgICogaXMgLSBHZXQgYW4gZXF1YWxpdHktdGVzdGluZyBjYWxsYmFjayBmb3IgdGhlIGdpdmVuIG9iamVjdC4gIFxuICAgKiAgICBcbiAgICogQHBhcmFtICB7R2VvbXxzdHJpbmd9IG9iaiBFaXRoZXIgdGhlIG5hbWUgb2YgdGhlIG9iamVjdCB0byB0ZXN0IG9yIHRoZSBvYmplY3QgaXRzZWxmLlxuICAgKiBAcmV0dXJuIHtHZW9tfmJvb2xlYW59IGEgZnVuY3Rpb24gdGhhdCB0ZXN0cyB3aGV0aGVyIGl0cyBhcmd1bWVudCBpcyBnZW9tZXRyaWNhbGx5IGVxdWFsIHRvIG9iai5cbiAgICovICAgXG4gIGlzKG9iaikge1xuICAgIGlmKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7IG9iaiA9IHRoaXMuZ2V0KG9iaik7IH1cbiAgICByZXR1cm4gKHNlY29uZE9iaikgPT4gKG9iaiAmJiB0aGlzLmVxdWFsKG9iaiwgc2Vjb25kT2JqKSk7XG4gIH1cbiAgXG4gIC8qKiAgXG4gICogaXMgLSBHZXQgYW4gTk9OLWVxdWFsaXR5LXRlc3RpbmcgY2FsbGJhY2sgZm9yIHRoZSBnaXZlbiBvYmplY3QuICBcbiAgKiAgICBcbiAgKiBAcGFyYW0gIHtHZW9tfHN0cmluZ30gb2JqIEVpdGhlciB0aGUgbmFtZSBvZiB0aGUgb2JqZWN0IHRvIHRlc3Qgb3IgdGhlIG9iamVjdCBpdHNlbGYuXG4gICogQHJldHVybiB7R2VvbX5ib29sZWFufSBhIGZ1bmN0aW9uIHRoYXQgdGVzdHMgd2hldGhlciBpdHMgYXJndW1lbnQgaXMgTk9UIGdlb21ldHJpY2FsbHkgZXF1YWwgdG8gb2JqLlxuICAqLyAgIFxuICBpc250KG9iaikge1xuICAgIGlmKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7IG9iaiA9IHRoaXMuZ2V0KG9iaik7IH1cbiAgICByZXR1cm4gKHNlY29uZE9iaikgPT4gKG9iaiAmJiAhdGhpcy5lcXVhbChvYmosIHNlY29uZE9iaikpO1xuICB9XG4gIFxuICBmcmVlTmFtZSgpIHtcbiAgICAvLyBUT0RPOiB0aGlzIGlzIGdvbm5hIGdldCB3ZWlyZCBpZiB3ZSBnbyBhYm92ZSAyNi5cbiAgICBsZXQgbWF4ID0gJ0EnLmNoYXJDb2RlQXQoMCkgLSAxLFxuICAgIGtleXMgPSB0aGlzLl9vYmplY3RzLmtleXMoKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYoa2V5c1tpXS5sZW5ndGggPT09IDEpXG4gICAgICAgIG1heCA9IE1hdGgubWF4KGtleXNbaV0uY2hhckNvZGVBdCgwKSwgbWF4KTtcbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUobWF4KzEpO1xuICB9XG4gIFxuXG4gIGFkZChvYmplY3QpIHtcbiAgICAvLyBpZiB3ZSBhbHJlYWR5IGhhdmUgdGhpcyBvYmplY3QsIGFuZCBpdCdzIHRoZSBzYW1lIHR5cGUsIHRoZW4gdXBkYXRlIHRoZVxuICAgIC8vIGV4aXN0aW5nIG9uZSBpbiBwbGFjZS5cbiAgICBsZXQgZXhpc3RpbmcgPSB0aGlzLl9vYmplY3RzLmdldChvYmplY3QubmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nICYmIGV4aXN0aW5nLmNvbnN0cnVjdG9yLm5hbWUgPT09IG9iamVjdC5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgICBmb3IobGV0IHByb3AgaW4gb2JqZWN0KSBleGlzdGluZ1twcm9wXSA9IG9iamVjdFtwcm9wXTtcbiAgICAgIG9iamVjdCA9IGV4aXN0aW5nO1xuICAgIH1cbiAgICAvLyBpZiBhIGdlb21ldHJpY2FsbHkgZXF1aXZhbGVudCBvYmplY3QgZXhpc3RzLCBkbyBub3RoaW5nLlxuICAgIGVsc2UgaWYoZXhpc3RpbmcgPSB0aGlzLmZpbmQob2JqZWN0KSkge1xuICAgICAgY29uc29sZS5sb2coJ1RyaWVkIHRvIGFkZCAnK29iamVjdCsnIGJ1dCAnK2V4aXN0aW5nKycgaXMgYWxyZWFkeSBpbiBzY2VuZS4nKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvLyBhZGQgYSBuZXcgb2JqZWN0IHRvIHRoZSBzY2VuZS5cbiAgICBlbHNlIHtcbiAgICAgIG9iamVjdC5uYW1lID0gb2JqZWN0Lm5hbWUgfHwgdGhpcy5mcmVlTmFtZSgpO1xuICAgICAgdGhpcy5fb2JqZWN0cy5zZXQob2JqZWN0Lm5hbWUsIG9iamVjdCk7XG4gICAgfVxuICAgIFxuICAgIGlmICh0aGlzLl9jdXJyZW50VGFnKSBhZGRDbGFzcyhvYmplY3QsIHRoaXMuX2N1cnJlbnRUYWcpO1xuICAgIGlmIChvYmplY3QuZnJlZSkgYWRkQ2xhc3Mob2JqZWN0LCAnZnJlZS1wb2ludCcpO1xuICAgIFxuICAgIHRoaXMudXBkYXRlKG9iamVjdCk7XG5cbiAgICB0aGlzLl9sYXN0ID0gb2JqZWN0O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBsYXN0KCkge1xuICAgIHJldHVybiB0aGlzLl9sYXN0O1xuICB9XG4gIFxuICBnZXQobmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9vYmplY3RzLmdldChuYW1lKTtcbiAgfVxuICBcbiAgcG9pbnQobmFtZSwgeCwgeSkge1xuICAgIGlmKHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgeSA9IHg7XG4gICAgICB4ID0gbmFtZTtcbiAgICAgIG5hbWUgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGQobmV3IFBvaW50KG5hbWUsIHgsIHkpKTtcbiAgfVxuICBcbiAgY2lyY2xlKG5hbWUsIGNlbnRlcklkLCBib3VuZGFyeUlkKSB7XG4gICAgaWYodHlwZW9mIGJvdW5kYXJ5SWQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBib3VuZGFyeUlkID0gY2VudGVySWQ7XG4gICAgICBjZW50ZXJJZCA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBDaXJjbGUobmFtZSwgdGhpcy5nZXQoY2VudGVySWQpLCB0aGlzLmdldChib3VuZGFyeUlkKSkpO1xuICB9XG4gIFxuICBzZWdtZW50KG5hbWUsIGlkMSwgaWQyKSB7XG4gICAgaWYodHlwZW9mIGlkMiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlkMiA9IGlkMTtcbiAgICAgIGlkMSA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBTZWdtZW50KG5hbWUsIHRoaXMuZ2V0KGlkMSksIHRoaXMuZ2V0KGlkMikpKTtcbiAgfVxuICBcbiAgbGluZShuYW1lLCBpZDEsIGlkMikge1xuICAgIGlmKHR5cGVvZiBpZDIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZDIgPSBpZDE7XG4gICAgICBpZDEgPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZChuZXcgTGluZShuYW1lLCB0aGlzLmdldChpZDEpLCB0aGlzLmdldChpZDIpKSk7XG4gIH1cbiAgXG4gIGludGVyc2VjdGlvbihuYW1lLCBpZDEsIGlkMiwgd2hpY2gpIHtcbiAgICBpZih0eXBlb2YgaWQyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgaWQyID0gaWQxO1xuICAgICAgaWQxID0gbmFtZTtcbiAgICAgIG5hbWUgPSBudWxsO1xuICAgIH1cblxuICAgIGxldCBvMSA9IHRoaXMuZ2V0KGlkMSksXG4gICAgICAgIG8yID0gdGhpcy5nZXQoaWQyKTtcbiAgICBpZighbzEpIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGZpbmQgb2JqZWN0IFwiK2lkMSk7XG4gICAgaWYoIW8yKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIG9iamVjdCBcIitpZDIpO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBJbnRlcnNlY3Rpb24obmFtZSwgbzEsIG8yLCB3aGljaCkpO1xuICB9XG4gIFxuICBncm91cCh0YWcpIHtcbiAgICB0aGlzLl9jdXJyZW50VGFnID0gdGFnO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICAvKiogIFxuICAgKiB1cGRhdGUgLSBVcGRhdGUgb2JqZWN0cyB0byByZWZsZWN0IGNoYW5nZXMgaW4gZGVwZW5kZW50IG9iamVjdHMuIChFLmcuLFxuICAgKiB1cGRhdGUgSW50ZXJzZWN0aW9uIGNvb3JkaW5hdGVzIHdoZW4gdGhlIGludGVyc2VjdGVkIG9iamVjdHMgaGF2ZSBjaGFuZ2VkLilcbiAgICogICAgXG4gICAqIEBwYXJhbSB7R2VvbX0gcm9vdCBUaGUgb2JqZWN0IGZyb20gd2hpY2ggdG8gc3RhcnQgd2Fsa2luZyB0aGUgZGVwZW5kZW5jeSBncmFwaC4gIFxuICAgKi9cbiAgLy8gVE9ETzogcmVzcGVjdCBgcm9vdGAgcGFyYW1ldGVyLCBhbmQgZG8gYW4gYWN0dWFsIERBRyB3YWxrLlxuICB1cGRhdGUocm9vdCkge1xuICAgIHRoaXMuX29iamVjdHMudmFsdWVzKClcbiAgICAgIC5maWx0ZXIob2JqID0+IG9iaiBpbnN0YW5jZW9mIEludGVyc2VjdGlvbilcbiAgICAgIC5mb3JFYWNoKG9iaiA9PiBvYmoudXBkYXRlKCkpXG4gIH1cbiAgXG4gIGxvZ1N0YXRlKGxhYmVsKSB7XG4gICAgbGV0IHNlbGYgPSB0aGlzO1xuICAgIGxldCBvYmplY3RzID0gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKTtcbiAgICBsZXQgcG9pbnRzID0gdGhpcy5wb2ludHMoKTtcblxuICAgIGxldCBzdGF0ZSA9IHtcbiAgICAgIGxhYmVsLFxuICAgICAgdGltZTogKG5ldyBEYXRlKCkpLnRvU3RyaW5nKCksXG4gICAgICBvYmplY3RzOiBvYmplY3RzLm1hcChvID0+IG8udG9TdHJpbmcoKSksXG4gICAgICBpbnRlcnNlY3Rpb25zOiB0aGlzLl9pbnRlcnNlY3Rpb25zLmtleXMoKVxuICAgIH1cbiAgICB0aGlzLmxvZy5wdXNoKHN0YXRlKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjZW5lO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcblxuZnVuY3Rpb24gdW5pcXVlX3ByZWQobGlzdCwgY29tcGFyZSkge1xuICB2YXIgcHRyID0gMVxuICAgICwgbGVuID0gbGlzdC5sZW5ndGhcbiAgICAsIGE9bGlzdFswXSwgYj1saXN0WzBdXG4gIGZvcih2YXIgaT0xOyBpPGxlbjsgKytpKSB7XG4gICAgYiA9IGFcbiAgICBhID0gbGlzdFtpXVxuICAgIGlmKGNvbXBhcmUoYSwgYikpIHtcbiAgICAgIGlmKGkgPT09IHB0cikge1xuICAgICAgICBwdHIrK1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgbGlzdFtwdHIrK10gPSBhXG4gICAgfVxuICB9XG4gIGxpc3QubGVuZ3RoID0gcHRyXG4gIHJldHVybiBsaXN0XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZV9lcShsaXN0KSB7XG4gIHZhciBwdHIgPSAxXG4gICAgLCBsZW4gPSBsaXN0Lmxlbmd0aFxuICAgICwgYT1saXN0WzBdLCBiID0gbGlzdFswXVxuICBmb3IodmFyIGk9MTsgaTxsZW47ICsraSwgYj1hKSB7XG4gICAgYiA9IGFcbiAgICBhID0gbGlzdFtpXVxuICAgIGlmKGEgIT09IGIpIHtcbiAgICAgIGlmKGkgPT09IHB0cikge1xuICAgICAgICBwdHIrK1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgbGlzdFtwdHIrK10gPSBhXG4gICAgfVxuICB9XG4gIGxpc3QubGVuZ3RoID0gcHRyXG4gIHJldHVybiBsaXN0XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZShsaXN0LCBjb21wYXJlLCBzb3J0ZWQpIHtcbiAgaWYobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbGlzdFxuICB9XG4gIGlmKGNvbXBhcmUpIHtcbiAgICBpZighc29ydGVkKSB7XG4gICAgICBsaXN0LnNvcnQoY29tcGFyZSlcbiAgICB9XG4gICAgcmV0dXJuIHVuaXF1ZV9wcmVkKGxpc3QsIGNvbXBhcmUpXG4gIH1cbiAgaWYoIXNvcnRlZCkge1xuICAgIGxpc3Quc29ydCgpXG4gIH1cbiAgcmV0dXJuIHVuaXF1ZV9lcShsaXN0KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVuaXF1ZVxuIl19
