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

},{"./calc":3,"./model":5,"uniq":15}],5:[function(require,module,exports){
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

var parser = require("euclid-parser");

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

    this._objects = d3.map();
    this._intersections = d3.map();
    this.equal = equalWithin(Math.sqrt(2));
    this.log = [];
  };

  Scene.prototype.parse = function (text, cb) {
    var _this = this;
    var parsedObjects = [], lines = text.split("\n");

    try {
      (function () {
        /* parse "[grouping]" statements directly, and geometry declarations using
         * the euclid-parser parser. */
        for (var i = 0; i < lines.length; i++) {
          lines[i] = lines[i].trim();
          if (/^\[.*\]$/.test(lines[i])) parsedObjects.push({
            type: "group",
            name: lines[i].slice(1, -1)
          });else if (lines[i].length > 0) parsedObjects.push(parser.parse(lines[i])[0]);
        }

        /* remove from scene any existing objects that weren't declared in the parsed text */
        var parsedNames = parsedObjects.map(function (o) {
          return o.name;
        });
        _this._objects.keys().filter(function (name) {
          return parsedNames.indexOf(name) < 0;
        }).forEach(function (name) {
          return _this._objects.remove(name);
        });

        /* now update scene with parsed objects */
        for (var i = 0; i < parsedObjects.length; i++) {
          var item = parsedObjects[i];

          switch (item.type) {
            case "group":
              _this.group(item.name);break;
            case "point":
              _this.point(item.name, item.x, item.y);break;
            case "line":
              _this.line(item.name, item.p1, item.p2);break;
            case "segment":
              _this.segment(item.name, item.p1, item.p2);break;
            case "circle":
              _this.circle(item.name, item.center, item.boundaryPoint);break;
            case "intersection":
              var which = 0;
              if (item.which && item.which.op === "not") which = _this.isnt(item.which.args[0]);
              _this.intersection(item.name, item.o1, item.o2, which);
              break;
          }
        }


        if (cb) cb(true);
      })();
    } catch (e) {
      if (cb) cb(null, e);
    }
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
    var _this2 = this;
    if (typeof obj === "string") {
      obj = this.get(obj);
    }
    return function (secondObj) {
      return (obj && _this2.equal(obj, secondObj));
    };
  };

  Scene.prototype.isnt = function (obj) {
    var _this3 = this;
    if (typeof obj === "string") {
      obj = this.get(obj);
    }
    return function (secondObj) {
      return (obj && !_this3.equal(obj, secondObj));
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

    return this;
  };

  Scene.prototype.get = function (name) {
    return this._objects.get(name);
  };

  Scene.prototype.point = function (name, x, y) {
    if (!y) {
      y = x;
      x = name;
      name = null;
    }
    return this.add(new Point(name, x, y));
  };

  Scene.prototype.circle = function (name, centerId, boundaryId) {
    if (!boundaryId) {
      boundaryId = centerId;
      centerId = name;
      name = null;
    }
    return this.add(new Circle(name, this.get(centerId), this.get(boundaryId)));
  };

  Scene.prototype.segment = function (name, id1, id2) {
    if (!id2) {
      id2 = id1;
      id1 = name;
      name = null;
    }
    return this.add(new Segment(name, this.get(id1), this.get(id2)));
  };

  Scene.prototype.line = function (name, id1, id2) {
    if (!id2) {
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
},{"./model":5,"./model/intersection":8,"euclid-parser":14}],14:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = [],
        peg$c1 = peg$FAILED,
        peg$c2 = null,
        peg$c3 = /^[.\n]/,
        peg$c4 = { type: "class", value: "[.\\n]", description: "[.\\n]" },
        peg$c5 = function(name, obj) { return withName(obj, name); },
        peg$c6 = function(name) {return name;},
        peg$c7 = function(obj, name) { return withName(obj, name); },
        peg$c8 = /^[ ]/,
        peg$c9 = { type: "class", value: "[ ]", description: "[ ]" },
        peg$c10 = "(",
        peg$c11 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c12 = ",",
        peg$c13 = { type: "literal", value: ",", description: "\",\"" },
        peg$c14 = ")",
        peg$c15 = { type: "literal", value: ")", description: "\")\"" },
        peg$c16 = function(x, y) { return {type: 'point', x:x, y:y}; },
        peg$c17 = function(center, boundaryPoint) { return {type: 'circle', center: center, boundaryPoint: boundaryPoint }; },
        peg$c18 = function(p1, p2) { return {type: 'line', p1: p1, p2: p2 }; },
        peg$c19 = function(line) { return line; },
        peg$c20 = function(p1, p2) { return {type: 'segment', p1: p1, p2: p2 }; },
        peg$c21 = "with endpoints",
        peg$c22 = { type: "literal", value: "with endpoints", description: "\"with endpoints\"" },
        peg$c23 = function(seg) { return seg; },
        peg$c24 = function(o1, o2, which) { return {type: 'intersection', o1: o1, o2: o2, which: which}; },
        peg$c25 = function(cond) { return { op: cond[0], args: [cond[1]] } },
        peg$c26 = "a",
        peg$c27 = { type: "literal", value: "a", description: "\"a\"" },
        peg$c28 = "an",
        peg$c29 = { type: "literal", value: "an", description: "\"an\"" },
        peg$c30 = function(r) { return r; },
        peg$c31 = "=",
        peg$c32 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c33 = "be",
        peg$c34 = { type: "literal", value: "be", description: "\"be\"" },
        peg$c35 = "equal",
        peg$c36 = { type: "literal", value: "equal", description: "\"equal\"" },
        peg$c37 = "by",
        peg$c38 = { type: "literal", value: "by", description: "\"by\"" },
        peg$c39 = "is",
        peg$c40 = { type: "literal", value: "is", description: "\"is\"" },
        peg$c41 = "it",
        peg$c42 = { type: "literal", value: "it", description: "\"it\"" },
        peg$c43 = "of",
        peg$c44 = { type: "literal", value: "of", description: "\"of\"" },
        peg$c45 = "on",
        peg$c46 = { type: "literal", value: "on", description: "\"on\"" },
        peg$c47 = "to",
        peg$c48 = { type: "literal", value: "to", description: "\"to\"" },
        peg$c49 = "and",
        peg$c50 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c51 = "let",
        peg$c52 = { type: "literal", value: "let", description: "\"let\"" },
        peg$c53 = "not",
        peg$c54 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c55 = "the",
        peg$c56 = { type: "literal", value: "the", description: "\"the\"" },
        peg$c57 = "call",
        peg$c58 = { type: "literal", value: "call", description: "\"call\"" },
        peg$c59 = "draw",
        peg$c60 = { type: "literal", value: "draw", description: "\"draw\"" },
        peg$c61 = "from",
        peg$c62 = { type: "literal", value: "from", description: "\"from\"" },
        peg$c63 = "that",
        peg$c64 = { type: "literal", value: "that", description: "\"that\"" },
        peg$c65 = "with center",
        peg$c66 = { type: "literal", value: "with center", description: "\"with center\"" },
        peg$c67 = "centered at",
        peg$c68 = { type: "literal", value: "centered at", description: "\"centered at\"" },
        peg$c69 = "containing",
        peg$c70 = { type: "literal", value: "containing", description: "\"containing\"" },
        peg$c71 = "defined",
        peg$c72 = { type: "literal", value: "defined", description: "\"defined\"" },
        peg$c73 = "determined",
        peg$c74 = { type: "literal", value: "determined", description: "\"determined\"" },
        peg$c75 = "intersection",
        peg$c76 = { type: "literal", value: "intersection", description: "\"intersection\"" },
        peg$c77 = "segment",
        peg$c78 = { type: "literal", value: "segment", description: "\"segment\"" },
        peg$c79 = "circle",
        peg$c80 = { type: "literal", value: "circle", description: "\"circle\"" },
        peg$c81 = "line",
        peg$c82 = { type: "literal", value: "line", description: "\"line\"" },
        peg$c83 = "point",
        peg$c84 = { type: "literal", value: "point", description: "\"point\"" },
        peg$c85 = { type: "other", description: "number" },
        peg$c86 = /^[0-9.\-]/,
        peg$c87 = { type: "class", value: "[0-9.\\-]", description: "[0-9.\\-]" },
        peg$c88 = function(digits) { return parseInt(digits.join(""), 10); },
        peg$c89 = { type: "other", description: "varname" },
        peg$c90 = /^[a-zA-Z0-9]/,
        peg$c91 = { type: "class", value: "[a-zA-Z0-9]", description: "[a-zA-Z0-9]" },
        peg$c92 = function(chars) { return chars.join(''); },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0, s1;

      s0 = [];
      s1 = peg$parsedecl();
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parsedecl();
      }

      return s0;
    }

    function peg$parsedecl() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parselet();
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevarname();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsebe();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseobject();
            if (s4 !== peg$FAILED) {
              s5 = [];
              if (peg$c3.test(input.charAt(peg$currPos))) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c4); }
              }
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                if (peg$c3.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c4); }
                }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c5(s2, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsedraw();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseobject();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$parseand();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsecall();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseit();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsevarname();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s3;
                    s4 = peg$c6(s7);
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              if (peg$c3.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c4); }
              }
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                if (peg$c3.test(input.charAt(peg$currPos))) {
                  s5 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c4); }
                }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c7(s2, s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseobject() {
      var s0;

      s0 = peg$parsepoint();
      if (s0 === peg$FAILED) {
        s0 = peg$parseobject2d();
      }

      return s0;
    }

    function peg$parsepoint() {
      var s0;

      s0 = peg$parsepoint_literal();
      if (s0 === peg$FAILED) {
        s0 = peg$parseintersection();
      }

      return s0;
    }

    function peg$parsepoint_literal() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsethe();
      if (s2 === peg$FAILED) {
        s2 = peg$parsea();
      }
      if (s2 === peg$FAILED) {
        s2 = peg$c2;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parset_point();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c8.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsenumber();
              if (s5 !== peg$FAILED) {
                s6 = [];
                if (peg$c8.test(input.charAt(peg$currPos))) {
                  s7 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  if (peg$c8.test(input.charAt(peg$currPos))) {
                    s7 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c9); }
                  }
                }
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s7 = peg$c12;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c13); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    if (peg$c8.test(input.charAt(peg$currPos))) {
                      s9 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c9); }
                    }
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      if (peg$c8.test(input.charAt(peg$currPos))) {
                        s9 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c9); }
                      }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsenumber();
                      if (s9 !== peg$FAILED) {
                        s10 = [];
                        if (peg$c8.test(input.charAt(peg$currPos))) {
                          s11 = input.charAt(peg$currPos);
                          peg$currPos++;
                        } else {
                          s11 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c9); }
                        }
                        while (s11 !== peg$FAILED) {
                          s10.push(s11);
                          if (peg$c8.test(input.charAt(peg$currPos))) {
                            s11 = input.charAt(peg$currPos);
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c9); }
                          }
                        }
                        if (s10 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 41) {
                            s11 = peg$c14;
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c15); }
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = [];
                            if (peg$c8.test(input.charAt(peg$currPos))) {
                              s13 = input.charAt(peg$currPos);
                              peg$currPos++;
                            } else {
                              s13 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c9); }
                            }
                            while (s13 !== peg$FAILED) {
                              s12.push(s13);
                              if (peg$c8.test(input.charAt(peg$currPos))) {
                                s13 = input.charAt(peg$currPos);
                                peg$currPos++;
                              } else {
                                s13 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c9); }
                              }
                            }
                            if (s12 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c16(s5, s9);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseobject2d() {
      var s0;

      s0 = peg$parsecircle();
      if (s0 === peg$FAILED) {
        s0 = peg$parseline();
        if (s0 === peg$FAILED) {
          s0 = peg$parsesegment();
        }
      }

      return s0;
    }

    function peg$parsecircle() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parsethe();
      if (s1 === peg$FAILED) {
        s1 = peg$parsea();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parset_circle();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsecentered();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsevarname();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsecontaining();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsevarname();
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c17(s4, s6);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseline() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parsethe();
      if (s1 === peg$FAILED) {
        s1 = peg$parsea();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parset_line();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parsefrom();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsevarname();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseto();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsevarname();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c18(s5, s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$parsecontaining();
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$currPos;
              s5 = peg$parsedetermined();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseby();
                if (s6 !== peg$FAILED) {
                  s5 = [s5, s6];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c1;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c1;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsevarname();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseand();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parsevarname();
                    if (s7 !== peg$FAILED) {
                      peg$reportedPos = s3;
                      s4 = peg$c18(s5, s7);
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c1;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c19(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsesegment() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parsethe();
      if (s1 === peg$FAILED) {
        s1 = peg$parsea();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parset_segment();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parsefrom();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsevarname();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseto();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsevarname();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c20(s5, s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$parsecontaining();
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              s4 = peg$parsedetermined();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseby();
                if (s5 !== peg$FAILED) {
                  s4 = [s4, s5];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
              if (s3 === peg$FAILED) {
                s3 = peg$currPos;
                s4 = peg$currPos;
                s5 = [];
                if (peg$c8.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  if (peg$c8.test(input.charAt(peg$currPos))) {
                    s6 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c9); }
                  }
                }
                if (s5 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 14) === peg$c21) {
                    s6 = peg$c21;
                    peg$currPos += 14;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c22); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = [];
                    if (peg$c8.test(input.charAt(peg$currPos))) {
                      s8 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c9); }
                    }
                    while (s8 !== peg$FAILED) {
                      s7.push(s8);
                      if (peg$c8.test(input.charAt(peg$currPos))) {
                        s8 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s8 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c9); }
                      }
                    }
                    if (s7 !== peg$FAILED) {
                      s5 = [s5, s6, s7];
                      s4 = s5;
                    } else {
                      peg$currPos = s4;
                      s4 = peg$c1;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c1;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c1;
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsevarname();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parseand();
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parsevarname();
                      if (s7 !== peg$FAILED) {
                        peg$reportedPos = s3;
                        s4 = peg$c20(s5, s7);
                        s3 = s4;
                      } else {
                        peg$currPos = s3;
                        s3 = peg$c1;
                      }
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c1;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c23(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseintersection() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parsea();
      if (s1 === peg$FAILED) {
        s1 = peg$parsethe();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parset_intersection();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseof();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsevarname();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseand();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsevarname();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsecondition();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c2;
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c24(s4, s6, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsecondition() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsethat();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseis();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parsenot();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsevarname();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$parseon();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsevarname();
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c25(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsea() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 1).toLowerCase() === peg$c26) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c27); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 2).toLowerCase() === peg$c28) {
            s2 = input.substr(peg$currPos, 2);
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c29); }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsebe() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s2 = peg$c31;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 2).toLowerCase() === peg$c33) {
            s2 = input.substr(peg$currPos, 2);
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 5).toLowerCase() === peg$c35) {
              s2 = input.substr(peg$currPos, 5);
              peg$currPos += 5;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c36); }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseby() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c37) {
          s2 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c38); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseis() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c39) {
          s2 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c40); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              if (peg$c8.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
            }
          } else {
            s3 = peg$c1;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseit() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c41) {
          s2 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c42); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              if (peg$c8.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
            }
          } else {
            s3 = peg$c1;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseof() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c43) {
          s2 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c44); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseon() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c45) {
          s2 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c46); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseto() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c47) {
          s2 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c48); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseand() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3).toLowerCase() === peg$c49) {
          s2 = input.substr(peg$currPos, 3);
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c50); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parselet() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3).toLowerCase() === peg$c51) {
          s2 = input.substr(peg$currPos, 3);
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c52); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsenot() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3).toLowerCase() === peg$c53) {
          s2 = input.substr(peg$currPos, 3);
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c54); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsethe() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3).toLowerCase() === peg$c55) {
          s2 = input.substr(peg$currPos, 3);
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c56); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsecall() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c57) {
          s2 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c58); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsedraw() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c59) {
          s2 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c60); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsefrom() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c61) {
          s2 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c62); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsethat() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c63) {
          s2 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c64); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsecentered() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 11).toLowerCase() === peg$c65) {
          s2 = input.substr(peg$currPos, 11);
          peg$currPos += 11;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c66); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 11).toLowerCase() === peg$c67) {
            s2 = input.substr(peg$currPos, 11);
            peg$currPos += 11;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c68); }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsecontaining() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 10).toLowerCase() === peg$c69) {
          s2 = input.substr(peg$currPos, 10);
          peg$currPos += 10;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c70); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsedetermined() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7).toLowerCase() === peg$c71) {
          s2 = input.substr(peg$currPos, 7);
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c72); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 10).toLowerCase() === peg$c73) {
            s2 = input.substr(peg$currPos, 10);
            peg$currPos += 10;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c74); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c30(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parset_intersection() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 12).toLowerCase() === peg$c75) {
          s2 = input.substr(peg$currPos, 12);
          peg$currPos += 12;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parset_segment() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7).toLowerCase() === peg$c77) {
          s2 = input.substr(peg$currPos, 7);
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c78); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parset_circle() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6).toLowerCase() === peg$c79) {
          s2 = input.substr(peg$currPos, 6);
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c80); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parset_line() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c81) {
          s2 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c82); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parset_point() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c8.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5).toLowerCase() === peg$c83) {
          s2 = input.substr(peg$currPos, 5);
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c84); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c86.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c86.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c87); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c88(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }

      return s0;
    }

    function peg$parsevarname() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsethe();
      if (s2 === peg$FAILED) {
        s2 = peg$c2;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parset_segment();
        if (s3 === peg$FAILED) {
          s3 = peg$parset_circle();
          if (s3 === peg$FAILED) {
            s3 = peg$parset_line();
            if (s3 === peg$FAILED) {
              s3 = peg$parset_point();
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c90.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c91); }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c90.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c91); }
            }
          }
        } else {
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c92(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c89); }
      }

      return s0;
    }


      function withName(obj, name) {
        obj.name = name;
        return obj;
      }


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvYmVoYXZpb3IuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvY2FsYy5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9pbnRlcnNlY3Rpb24uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvY2lyY2xlLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2dlb20uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvaW50ZXJzZWN0aW9uLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2xpbmUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvcG9pbnQuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvc2VnbWVudC5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9yZW5kZXIuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvc2NlbmUuanMiLCJub2RlX21vZHVsZXMvZXVjbGlkLXBhcnNlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy91bmlxL3VuaXEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0NBLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFdkIsU0FBUyxTQUFTLENBQUMsQ0FBQyxFQUFFO0FBQ3BCLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDbkIsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFD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LEdBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUMsTUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVoQixNQUFJLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDOUIsTUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztBQUMvQyxNQUFHLElBQUksR0FBRyxDQUFDLEVBQUU7QUFBRSxXQUFPLEVBQUUsQ0FBQztHQUFFOztBQUUzQixNQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxLQUFLLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDO0FBQzlDLE1BQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLEtBQUssRUFDL0MsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7Ozs7QUFJdkMsU0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQy9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQzs7OztHQUFBO0NBSWhFOzs7QUFHRCxNQUFNLENBQUMsT0FBTyxHQUFH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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDajZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbnZhciBkMyA9IHJlcXVpcmUoJ2QzJyk7XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZShwKSB7XG4gIHAueCArPSBkMy5ldmVudC5keDtcbiAgcC55ICs9IGQzLmV2ZW50LmR5O1xufVxuXG5cbmZ1bmN0aW9uIHBvaW50KHVwZGF0ZSkge1xuICByZXR1cm4gZDMuYmVoYXZpb3IuZHJhZygpXG4gIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICBkLnggPSBkMy5ldmVudC54O1xuICAgIGQueSA9IGQzLmV2ZW50Lnk7XG4gICAgdXBkYXRlKCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjaXJjbGUodXBkYXRlKSB7XG4gIHJldHVybiBkMy5iZWhhdmlvci5kcmFnKClcbiAgLm9uKCdkcmFnJywgZnVuY3Rpb24oZCkge1xuICAgIGlmKGQuYm91bmRhcnlQb2ludCkge1xuICAgICAgaWYoZC5ib3VuZGFyeVBvaW50LmZyZWUgJiYgZC5jZW50ZXIuZnJlZSkge1xuICAgICAgICB0cmFuc2xhdGUoZC5jZW50ZXIpO1xuICAgICAgICB0cmFuc2xhdGUoZC5ib3VuZGFyeVBvaW50KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgeyByZXR1cm47IH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBsZXQgZHggPSBkLmNlbnRlci54IC0gZDMuZXZlbnQueDtcbiAgICAgIGxldCBkeSA9IGQuY2VudGVyLnkgLSBkMy5ldmVudC55O1xuICAgICAgZC5yYWRpdXMgPSBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSk7XG4gICAgfVxuICAgIHVwZGF0ZSgpO1xuICB9KVxufVxuICBcbmZ1bmN0aW9uIGxpbmUodXBkYXRlKSB7XG4gIHJldHVybiBkMy5iZWhhdmlvci5kcmFnKClcbiAgLm9uKCdkcmFnJywgZnVuY3Rpb24oZCkge1xuICAgIGlmKGQuX3Auc29tZShwPT4hcC5mcmVlKSkgeyByZXR1cm47IH1cbiAgICBkLl9wLmZvckVhY2godHJhbnNsYXRlKTsgLy8gVE9ETzogYXZvaWQgYWNjZXNzaW5nIHByaXZhdGUgX3AuLi4uXG4gICAgdXBkYXRlKCk7XG4gIH0pXG59XG5cbmZ1bmN0aW9uIGZvbGxvdyhzdmcsIHBvaW50LCB1cGRhdGUpIHtcbiAgbGV0IGZvbGxvd2luZyA9IGZhbHNlO1xuICBsZXQge3g6IG1vdXNleCwgeTogbW91c2V5fSA9IHBvaW50O1xuICBkMy5zZWxlY3QoJ2JvZHknKS5vbignbW91c2Vtb3ZlJywgZnVuY3Rpb24oKSB7XG4gICAgKFttb3VzZXgsIG1vdXNleV0gPSBkMy5tb3VzZShzdmcpKTtcbiAgICBpZighZm9sbG93aW5nKSBzdGVwKCk7XG4gIH0pO1xuICBmdW5jdGlvbiBzdGVwKCkge1xuICAgIGxldCBkeCA9IChtb3VzZXggLSBwb2ludC54KSxcbiAgICAgIGR5ID0gKG1vdXNleSAtIHBvaW50LnkpLFxuICAgICAgZHNxID0gZHgqZHggKyBkeSpkeSxcbiAgICAgIGQgPSBNYXRoLnNxcnQoZHNxKTtcbiAgICBcbiAgICBpZihkID4gMTApIHtcbiAgICAgIGZvbGxvd2luZyA9IHRydWU7XG4gICAgICBwb2ludC54ICs9IGR4L2Q7XG4gICAgICBwb2ludC55ICs9IGR5L2Q7XG4gICAgICB1cGRhdGUoKTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZm9sbG93aW5nID0gZmFsc2U7XG4gICAgfVxuICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1vdmU6IHsgY2lyY2xlLCBsaW5lLCBwb2ludCB9LFxuICBmb2xsb3dcbn1cbiIsIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZGlzdGFuY2UsXG4gIGRpc3RhbmNlU3F1YXJlZFxufVxuXG4vKiByZXR1cm5zIHRoZSBFdWNsaWRlYW4gZGlzdGFuY2UgYmV0d2VlbiAocDEueCwgcDEueSkgYW5kIChwMi54LCBwMi55KSAqL1xuZnVuY3Rpb24gZGlzdGFuY2UocDEsIHAyKSB7XG4gIHJldHVybiBNYXRoLnNxcnQoZGlzdGFuY2VTcXVhcmVkKHAxLCBwMikpO1xufVxuXG4vKiByZXR1cm5zIHRoZSBzcXVhcmVkIEV1Y2xpZGVhbiBkaXN0YW5jZSBiZXR3ZWVuIChwMS54LCBwMS55KSBhbmQgKHAyLngsIHAyLnkpICovXG5mdW5jdGlvbiBkaXN0YW5jZVNxdWFyZWQocDEsIHAyKSB7XG4gIGxldCBkeCA9IHAxLnggLSBwMi54LFxuICAgICAgZHkgPSBwMS55IC0gcDIueTtcbiAgcmV0dXJuIGR4KmR4ICsgZHkqZHk7XG59XG4iLCJcbmxldCB1bmlxID0gcmVxdWlyZSgndW5pcScpO1xuXG5sZXQge1BvaW50LCBMaW5lLCBTZWdtZW50LCBDaXJjbGV9ID0gcmVxdWlyZSgnLi9tb2RlbCcpLFxuICAgIFAgPSBQb2ludC5QLFxuICAgIGRkID0gcmVxdWlyZSgnLi9jYWxjJykuZGlzdGFuY2VTcXVhcmVkO1xuXG4vKiBoZWxwZXJzICovXG5mdW5jdGlvbiBjb21wYXJlUG9pbnRzKHAsIHEpIHsgcmV0dXJuIChwLnggPT09IHEueCAmJiBwLnkgPT09IHEueSkgPyAwIDogMTsgfVxuZnVuY3Rpb24gc3EoYSkgeyByZXR1cm4gYSphOyB9XG5cbi8qXG4gIEludGVyc2VjdGlvbiBvZiB0d28gb2JqZWN0czsgcmV0dXJucyBhbiBhcnJheSwgcG9zc2libHkgZW1wdHksIG9mIFxuICBpbnRlcnNlY3Rpb24gcG9pbnRzLlxuKi9cblxuLyoqXG4gKiBpbnRlcnNlY3QgLSBGaW5kIHRoZSBpbnRlcnNlY3Rpb24ocykgb2YgdGhlIGdpdmVuIHR3byBvYmplY3RzLlxuICogIFxuICogQHBhcmFtICB7R2VvbX0gbzEgZmlyc3Qgb2JqZWN0IFxuICogQHBhcmFtICB7R2VvbX0gbzIgc2Vjb25kIG9iamVjdCBcbiAqIEByZXR1cm4ge0FycmF5LjxQb2ludD59ICAgIFBvaW50cyBvZiBpbnRlcnNlY3Rpb24gYmV0d2VlbiB0aGUgdHdvIG9iamVjdHMuIFxuICovIFxuZnVuY3Rpb24gaW50ZXJzZWN0KG8xLCBvMikge1xuICBpZihvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIENpcmNsZSkgLy8gY2lyY2xlLWNpcmNsZVxuICAgIHJldHVybiBpbnRlcnNlY3RDaXJjbGVDaXJjbGUobzEsIG8yKTtcbiAgZWxzZSBpZihvMiBpbnN0YW5jZW9mIENpcmNsZSkgLy8gaWYgb25seSBvbmUgaXMgYSBjaXJjbGUsIGl0IHNob3VsZCBiZSBmaXJzdC5cbiAgICByZXR1cm4gaW50ZXJzZWN0KG8yLCBvMSk7IFxuICBlbHNlIGlmKG8xIGluc3RhbmNlb2YgQ2lyY2xlICYmIG8yIGluc3RhbmNlb2YgTGluZSkgLy8gY2lyY2xlLWxpbmUob3Igc2VnbWVudClcbiAgICByZXR1cm4gaW50ZXJzZWN0Q2lyY2xlTGluZShvMSwgbzIpO1xuICBlbHNlIGlmKG8xIGluc3RhbmNlb2YgU2VnbWVudCAmJiBvMiBpbnN0YW5jZW9mIFNlZ21lbnQpIC8vIHNlZ21lbnQtc2VnbWVudFxuICAgIHJldHVybiBpbnRlcnNlY3RMaW5lTGluZShvMSwgbzIsIHRydWUpO1xuICBlbHNlIGlmKG8yIGluc3RhbmNlb2YgU2VnbWVudCkgLy8gaWYgb25seSBvbmUgaXMgYSBzZWdtZW50LCBpdCBzaG91bGQgYmUgZmlyc3QuXG4gICAgcmV0dXJuIGludGVyc2VjdChvMiwgbzEpO1xuICBlbHNlIGlmKG8xIGluc3RhbmNlb2YgTGluZSAmJiBvMiBpbnN0YW5jZW9mIExpbmUpXG4gICAgcmV0dXJuIGludGVyc2VjdExpbmVMaW5lKG8xLCBvMiwgZmFsc2UpO1xuXG4gIC8vIFRPRE86IGNpcmNsZS1wb2ludCwgc2VnbWVudC1wb2ludCwgcG9pbnQtcG9pbnRcbiAgZWxzZSBpZihvMiBpbnN0YW5jZW9mIFBvaW50IHx8IG8xIGluc3RhbmNlb2YgUG9pbnQpXG4gICAgcmV0dXJuIFtdO1xuICAgIFxuICBlbHNlIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGludGVyc2VjdCAnICsgXG4gICAgbzEuY29uc3RydWN0b3IubmFtZSArICcgYW5kICcgKyBvMi5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgXG59XG5cbmZ1bmN0aW9uIGludGVyc2VjdENpcmNsZUNpcmNsZShjMSwgYzIpIHtcbiAgbGV0IGRzcSA9IGRkKGMxLmNlbnRlciwgYzIuY2VudGVyKTtcbiAgbGV0IGQgPSBNYXRoLnNxcnQoZHNxKTtcbiAgXG4gIGlmKGQgPiBjMS5yYWRpdXMgKyBjMi5yYWRpdXMpIHsgcmV0dXJuIFtdOyB9XG4gIGVsc2UgaWYoZCA8IGMxLnJhZGl1cyAtIGMyLnJhZGl1cykgeyByZXR1cm4gW107IH1cbiAgZWxzZSBpZihkc3EgPT09IDApIHsgcmV0dXJuIFtdOyB9XG4gICAgXG4gIGxldCBhID0gKGMxLnJhZGl1c3NxIC0gYzIucmFkaXVzc3EgKyBkc3EpIC8gKDIqZCk7XG4gIGxldCBoID0gTWF0aC5zcXJ0KE1hdGgubWF4KGMxLnJhZGl1c3NxIC0gc3EoYSksIDApKTtcbiAgbGV0IGN4ID0gYzEuY2VudGVyLnggKyBhKihjMi5jZW50ZXIueCAtIGMxLmNlbnRlci54KS9kO1xuICBsZXQgY3kgPSBjMS5jZW50ZXIueSArIGEqKGMyLmNlbnRlci55IC0gYzEuY2VudGVyLnkpL2Q7XG4gIFxuICBsZXQgbnggPSBoICogKGMxLmNlbnRlci55IC0gYzIuY2VudGVyLnkpL2Q7XG4gIGxldCBueSA9IGggKiAoYzEuY2VudGVyLnggLSBjMi5jZW50ZXIueCkvZDtcbiAgXG4gIHJldHVybiB1bmlxKFtQKDAsIGN4K254LCBjeS1ueSksIFAoMSwgY3gtbngsIGN5K255KV0sIGNvbXBhcmVQb2ludHMpO1xufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RMaW5lTGluZShzMSwgczIsIGNsaXApIHtcbiAgbGV0IFt7eDp4MSwgeTp5MX0sIHt4OngyLCB5OnkyfV0gPSBzMS5fcDtcbiAgbGV0IFt7eDp4MywgeTp5M30sIHt4Ong0LCB5Onk0fV0gPSBzMi5fcDtcbiAgbGV0IHMgPSAoLXMxLmR5ICogKHgxIC0geDMpICsgczEuZHggKiAoeTEgLSB5MykpIC8gKC1zMi5keCAqIHMxLmR5ICsgczEuZHggKiBzMi5keSlcbiAgbGV0IHQgPSAoczIuZHggKiAoeTEgLSB5MykgLSBzMi5keSAqICh4MSAtIHgzKSkgLyAoLXMyLmR4ICogczEuZHkgKyBzMS5keCAqIHMyLmR5KVxuICBcbiAgaWYoIWNsaXAgfHwgKHMgPj0gMCAmJiBzIDw9IDEgJiYgdCA+PSAwICYmIHQgPD0gMSkpXG4gICAgcmV0dXJuIFtQKDAsIHgxICsgdCpzMS5keCwgeTEgKyB0KnMxLmR5KV1cbiAgZWxzZVxuICAgIHJldHVybiBbXTsgLy8gbm8gY29sbGlzaW9uXG59XG5cbi8qIGh0dHA6Ly9tYXRod29ybGQud29sZnJhbS5jb20vQ2lyY2xlLUxpbmVJbnRlcnNlY3Rpb24uaHRtbCAqL1xuZnVuY3Rpb24gaW50ZXJzZWN0Q2lyY2xlTGluZShjLCBzKSB7XG4gIGxldCBbe3g6eDEsIHk6eTF9LCB7eDp4MiwgeTp5Mn1dID0gcy5fcDtcbiAgbGV0IHt4OngwLCB5OnkwfSA9IGMuY2VudGVyO1xuXG4gIC8vIG5vdGUgdGhlIHRyYW5zbGF0aW9uICh4MCwgeTApLT4oMCwwKS5cbiAgbGV0IEQgPSAoeDEteDApKih5Mi15MCkgLSAoeDIteDApKih5MS15MCk7XG4gIGxldCBEc3EgPSBzcShEKTtcbiAgICBcbiAgbGV0IGxlbnNxID0gc3Eocy5keCkrc3Eocy5keSk7XG4gIGxldCBkaXNjID0gTWF0aC5zcXJ0KHNxKGMucmFkaXVzKSpsZW5zcSAtIERzcSk7XG4gIGlmKGRpc2MgPCAwKSB7IHJldHVybiBbXTsgfVxuXG4gIGxldCBjeCA9IEQqcy5keSAvIGxlbnNxLCBjeSA9IC1EKnMuZHggLyBsZW5zcTtcbiAgbGV0IG54ID0gKHMuZHkgPCAwID8gLTEqcy5keCA6IHMuZHgpICogZGlzYyAvIGxlbnNxLFxuICAgICAgbnkgPSBNYXRoLmFicyhzLmR5KSAqIGRpc2MgLyBsZW5zcTtcblxuXG4gIC8vIHRyYW5zbGF0ZSAoMCwwKS0+KHgwLCB5MCkuXG4gIHJldHVybiB1bmlxKFtQKDAsIGN4ICsgbnggKyB4MCwgY3kgKyBueSArIHkwKSwgXG4gICAgICAgICAgICAgICAgUCgxLCBjeCAtIG54ICsgeDAsIGN5IC0gbnkgKyB5MCldLCBjb21wYXJlUG9pbnRzKVxuXG4gICAgICAgIC8vIFRPRE86IHJlaW5zdGF0ZSB0aGlzIGFmdGVyIGFkZHJlc3NpbmcgaHR0cHM6Ly9naXRodWIuY29tL2FuYW5kdGhha2tlci9ldWNsaWQvaXNzdWVzLzFcbiAgICAgICAgLy8gIC5maWx0ZXIocy5jb250YWlucy5iaW5kKHMpKTsgLy8gZmlsdGVyIG91dCBwb2ludHMgbm90IGRlZmluZWQgb24gc2VnbWVudFxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbnRlcnNlY3QsXG4gIGludGVyc2VjdENpcmNsZUNpcmNsZSxcbiAgaW50ZXJzZWN0Q2lyY2xlTGluZSxcbiAgaW50ZXJzZWN0TGluZUxpbmV9XG4gIFxuIiwiXG5sZXQgUG9pbnQgPSByZXF1aXJlKCcuL21vZGVsL3BvaW50JyksXG4gICAgQ2lyY2xlID0gcmVxdWlyZSgnLi9tb2RlbC9jaXJjbGUnKSxcbiAgICBMaW5lID0gcmVxdWlyZSgnLi9tb2RlbC9saW5lJyksXG4gICAgU2VnbWVudCA9IHJlcXVpcmUoJy4vbW9kZWwvc2VnbWVudCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgUDogUG9pbnQuUCxcbiAgUG9pbnQsXG4gIENpcmNsZSxcbiAgU2VnbWVudCxcbiAgTGluZSxcbiAgZXF1YWxXaXRoaW5cbn07XG5cblxuLyogcmV0dXJuIGEgZGVlcC1lcXVhbGl0eSB0ZXN0IGZ1bmN0aW9uIHRoYXQgY2hlY2tzIGZvciBnZW9tZXRyaWMgb2JqZWN0XG4gICBlcXVhbGl0eSB1c2luZyB0aGUgZ2l2ZW4gZGlzdGFuY2UgdGhyZXNob2xkIGZvciBwb2ludCBlcXVhbGl0eTsgaS5lLiwgaWYgXG4gICB0d28gcG9pbnRzIGFyZSBjbG9zZXIgdGhhbiBgdGhyZXNob2xkYCwgY29uc2lkZXIgdGhlbSBlcXVhbC4gKi9cbmZ1bmN0aW9uIGVxdWFsV2l0aGluKHRocmVzaG9sZCkge1xuICB0aHJlc2hvbGQgPSB0aHJlc2hvbGQgfHwgMDtcbiAgcmV0dXJuIGZ1bmN0aW9uIGVxdWFsKG8xLCBvMikge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG8xKSAmJiBBcnJheS5pc0FycmF5KG8yKSkge1xuICAgICAgcmV0dXJuIG8xLmV2ZXJ5KChvYmosIGluZGV4KSA9PiBlcXVhbChvYmosIG8yW2luZGV4XSkpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgbzEgPT09ICdudW1iZXInICYmIHR5cGVvZiBvMiA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiBNYXRoLmFicyhvMSAtIG8yKSA8IHRocmVzaG9sZDtcbiAgICB9XG4gICAgaWYgKG8xIGluc3RhbmNlb2YgUG9pbnQgJiYgbzIgaW5zdGFuY2VvZiBQb2ludCkge1xuICAgICAgLy8gcmV0dXJuIGVxdWFsKG5ldyBTZWdtZW50KG8xLCBvMikubGVuZ3RoLCAwKTtcbiAgICAgIC8vIHRheGljYWIgZGlzdGFuY2UgLS0gZmFzdGVyP1xuICAgICAgcmV0dXJuIGVxdWFsKE1hdGguYWJzKG8xLnggLSBvMi54KSArIE1hdGguYWJzKG8xLnkgLSBvMi55KSwgMCk7XG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIENpcmNsZSkge1xuICAgICAgcmV0dXJuIGVxdWFsKG8xLnJhZGl1cywgbzIucmFkaXVzKSAmJiBlcXVhbChvMS5jZW50ZXIsIG8yLmNlbnRlcik7XG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIFNlZ21lbnQgJiYgbzIgaW5zdGFuY2VvZiBTZWdtZW50KSB7XG4gICAgICB2YXIgcDEgPSBbXS5jb25jYXQobzEucCksXG4gICAgICAgICAgcDIgPSBbXS5jb25jYXQobzIucClcbiAgICAgIC8vIGVuc3VyZSBwb2ludHMgZnJvbSBib3RoIHNlZ21lbnRzIGFyZSBpbiB0aGUgc2FtZSBvcmRlciBcbiAgICAgIC8vIChsZWZ0IHRvIHJpZ2h0IG9yIHJpZ2h0IHRvIGxlZnQpLlxuICAgICAgaWYocDFbMF0ueCA+IHAxWzFdLnggJiYgcDJbMF0ueCA8IHAyWzBdLngpIHAxLnJldmVyc2UoKTtcbiAgICAgIC8vIHRoZW4gZGVsZWdhdGUgdG8gcG9pbnQgZXF1YWxpdHlcbiAgICAgIHJldHVybiBlcXVhbChwMSwgcDIpXG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIExpbmUgJiYgbzIgaW5zdGFuY2VvZiBMaW5lKSB7XG4gICAgICByZXR1cm4gZXF1YWwobzEubSwgbzIubSkgJiYgZXF1YWwobzEueSgwKSwgbzIueSgwKSkgJiYgZXF1YWwobzEueCgwKSwgbzIueCgwKSk7XG4gICAgfVxuXG4gICAgLy8gZmFsbGJhY2sgdG8gb2JqZWN0IGVxdWFsaXR5XG4gICAgcmV0dXJuIG8xID09PSBvMjtcbiAgfVxufVxuIiwibGV0IEdlb20gPSByZXF1aXJlKCcuL2dlb20nKSxcbiAgICBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKSxcbiAgICBTZWdtZW50ID0gcmVxdWlyZSgnLi9zZWdtZW50JyksXG4gICAge2Rpc3RhbmNlLCBkaXN0YW5jZVNxdWFyZWR9ID0gcmVxdWlyZSgnLi4vY2FsYycpO1xuXG5jbGFzcyBDaXJjbGUgZXh0ZW5kcyBHZW9tIHtcbiAgXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNlbnRlciwgYSkge1xuICAgIHN1cGVyKG5hbWUpO1xuICAgIHRoaXMuY2VudGVyID0gY2VudGVyO1xuICAgIGlmIChhIGluc3RhbmNlb2YgUG9pbnQpIHtcbiAgICAgIHRoaXMuX2Zyb21DZW50ZXJBbmRCb3VuZGFyeVBvaW50KGNlbnRlciwgYSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHRoaXMuX2Zyb21DZW50ZXJBbmRSYWRpdXMoY2VudGVyLCBhKTtcbiAgICB9XG4gIH1cbiAgXG4gIF9mcm9tQ2VudGVyQW5kUmFkaXVzKGNlbnRlciwgcmFkaXVzKSB7XG4gICAgdGhpcy5yYWRpdXMgPSByYWRpdXM7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgcmFkaXVzc3E6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJhZGl1cyAqIHRoaXMucmFkaXVzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgXG4gIF9mcm9tQ2VudGVyQW5kQm91bmRhcnlQb2ludChjZW50ZXIsIGJvdW5kYXJ5UG9pbnQpIHtcbiAgICB0aGlzLmJvdW5kYXJ5UG9pbnQgPSBib3VuZGFyeVBvaW50O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgIHJhZGl1czoge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGRpc3RhbmNlKHRoaXMuYm91bmRhcnlQb2ludCwgdGhpcy5jZW50ZXIpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmFkaXVzc3E6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBkaXN0YW5jZVNxdWFyZWQodGhpcy5ib3VuZGFyeVBvaW50LCB0aGlzLmNlbnRlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG4gIFxuICB5KHgpIHtcbiAgICB2YXIgdyA9IE1hdGguYWJzKHggLSB0aGlzLmNlbnRlci54KTtcbiAgICBpZiAodyA+IHRoaXMucmFkaXVzKSByZXR1cm4gbnVsbDtcbiAgICBpZiAodyA9PT0gdGhpcy5yYWRpdXMpIHJldHVybiBuZXcgUG9pbnQoeCwgdGhpcy5jZW50ZXIueSk7XG4gICAgXG4gICAgdmFyIGggPSBNYXRoLnNxcnQodGhpcy5yYWRpdXMgKiB0aGlzLnJhZGl1cyAtIHcgKiB3KTtcbiAgICByZXR1cm4gW3RoaXMuY2VudGVyLnkgKyBoLCB0aGlzLmNlbnRlci55IC0gaF07XG4gIH1cbiAgXG4gIGNvbnRhaW5zKHApIHtcbiAgICByZXR1cm4gZGlzdGFuY2VTcXVhcmVkKHAsIHRoaXMuY2VudGVyKSA9PT0gdGhpcy5yYWRpdXNzcTtcbiAgfVxuICBcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdDaXJjbGUnICsgc3VwZXIudG9TdHJpbmcoKSArICdbJyArIHRoaXMuY2VudGVyLnRvU3RyaW5nKCkgKyAnOycgKyB0aGlzLnJhZGl1cyArICddJztcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENpcmNsZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gY2xhc3MgR2VvbSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICB9XG4gIFxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lO1xuICB9XG59XG4iLCJcbmxldCBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKSxcbiAgICB7aW50ZXJzZWN0fSA9IHJlcXVpcmUoJy4uL2ludGVyc2VjdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cz1cbmNsYXNzIEludGVyc2VjdGlvbiBleHRlbmRzIFBvaW50IHtcbiAgXG4gIFxuICAvKiogIFxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0gey4uLkdlb219IG9iamVjdHMgdG8gYmUgaW50ZXJzZWN0ZWRcbiAgICogQHBhcmFtIHtudW1iZXJ8R2VvbX5ib29sZWFufSBbd2hpY2hdIG9wdGlvbmFsIGFycmF5IGluZGV4IG9yIGZpbHRlciBjYWxsYmFjayBpbiBjYXNlIHRoZXJlIGFyZSBtdWx0aXBsZSBpbnRlcnNlY3Rpb25zLlxuICAgKi8gICBcbiAgY29uc3RydWN0b3IobmFtZSwgLi4ub2JqZWN0cykge1xuICAgIHN1cGVyKG5hbWUsIG51bGwsIG51bGwpO1xuICAgIFxuICAgIHRoaXMud2hpY2ggPSAvZnVuY3Rpb258bnVtYmVyLy50ZXN0KHR5cGVvZiBvYmplY3RzW29iamVjdHMubGVuZ3RoIC0gMV0pID9cbiAgICAgIG9iamVjdHMucG9wKCkgOiAwO1xuICAgIHRoaXMub2JqZWN0cyA9IG9iamVjdHM7XG4gICAgdGhpcy5mcmVlID0gZmFsc2U7XG4gIH1cbiAgXG4gIHVwZGF0ZSgpIHtcbiAgICBsZXQgcmVzdWx0ID0gaW50ZXJzZWN0LmFwcGx5KG51bGwsIHRoaXMub2JqZWN0cyk7XG4gICAgaWYodHlwZW9mIHRoaXMud2hpY2ggPT09ICdmdW5jdGlvbicpXG4gICAgICByZXN1bHQgPSByZXN1bHQuZmlsdGVyKHRoaXMud2hpY2gpWzBdO1xuICAgIGVsc2VcbiAgICAgIHJlc3VsdCA9IHJlc3VsdFt0aGlzLndoaWNoXTtcbiAgICAgIFxuICAgIGlmKHJlc3VsdCkge1xuICAgICAgKHt4OiB0aGlzLngsIHk6IHRoaXMueX0gPSByZXN1bHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMueCA9IHRoaXMueSA9IG51bGw7XG4gICAgfVxuICB9XG4gIFxuICB0b1N0cmluZyh2ZXJib3NlKSB7XG4gICAgbGV0IHBzdHIgPSBzdXBlci50b1N0cmluZygpO1xuICAgIHJldHVybiAoIXZlcmJvc2UpID8gcHN0ciA6XG4gICAgcHN0ciArICc7IGludGVyc2VjdGlvbiBvZjogJyArIHRoaXMub2JqZWN0cy5tYXAobyA9PiBvLnRvU3RyaW5nKCkpLmpvaW4oJywnKTtcbiAgfVxufVxuIiwiXG5sZXQgR2VvbSA9IHJlcXVpcmUoJy4vZ2VvbScpO1xuXG5jbGFzcyBMaW5lIGV4dGVuZHMgR2VvbSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUsIHAxLCBwMikge1xuICAgIHN1cGVyKG5hbWUpO1xuICAgIGlmICghcDIpIHtcbiAgICAgIHRoaXMuX3AgPSBwMS5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wID0gW3AxLCBwMl07XG4gICAgfVxuICAgIFxuICAgIHRoaXMuX2NsaXAgPSBmYWxzZTtcbiAgICBcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAvLyBUT0RPOiBJIGRvbid0IGxpa2UgZHggYW5kIGR5IG9uIHRoZSBsaW5lIGNsYXNzLi4uXG4gICAgICBkeDoge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3BbMV0ueCAtIHRoaXMuX3BbMF0ueDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGR5OiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fcFsxXS55IC0gdGhpcy5fcFswXS55O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdGhldGE6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMuZHksIHRoaXMuZHgpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZHggPT09IDApIHJldHVybiBudWxsO1xuICAgICAgICAgIGVsc2UgcmV0dXJuIHRoaXMuZHkgLyB0aGlzLmR4O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXG4gICAgICBsZWZ0OiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1pbih0aGlzLl9wWzBdLngsIHRoaXMuX3BbMV0ueCkgOiBudWxsOyB9XG4gICAgICB9LFxuICAgICAgcmlnaHQ6IHtcbiAgICAgICAgZ2V0KCkgeyByZXR1cm4gdGhpcy5fY2xpcCA/IE1hdGgubWF4KHRoaXMuX3BbMF0ueCwgdGhpcy5fcFsxXS54KSA6IG51bGw7IH1cbiAgICAgIH0sXG4gICAgICB0b3A6IHtcbiAgICAgICAgZ2V0KCkgeyByZXR1cm4gdGhpcy5fY2xpcCA/IE1hdGgubWluKHRoaXMuX3BbMF0ueSwgdGhpcy5fcFsxXS55KSA6IG51bGw7IH1cbiAgICAgIH0sXG4gICAgICBib3R0b206IHtcbiAgICAgICAgZ2V0KCkgeyByZXR1cm4gdGhpcy5fY2xpcCA/IE1hdGgubWF4KHRoaXMuX3BbMF0ueSwgdGhpcy5fcFsxXS55KSA6IG51bGw7IH1cbiAgICAgIH1cbiAgICAgIFxuICAgIH0pXG4gIH1cbiAgXG4gIHkoeCkge1xuICAgIGlmICgodGhpcy5keCA9PT0gMCkgfHwgKHRoaXMuX2NsaXAgJiYgKHRoaXMubGVmdCA+IHggfHwgdGhpcy5yaWdodCA8IHgpKSlcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGVsc2UgXG4gICAgICByZXR1cm4gdGhpcy5fcFswXS55ICsgKHggLSB0aGlzLl9wWzBdLngpICogKHRoaXMuZHkpIC8gKHRoaXMuZHgpXG4gIH1cblxuICB4KHkpIHtcbiAgICBpZiAoKHRoaXMuZHkgPT09IDApIHx8ICh0aGlzLl9jbGlwICYmICh0aGlzLnRvcCA+IHkgfHwgdGhpcy5ib3R0b20gPCB5KSkpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBlbHNlIFxuICAgICAgcmV0dXJuIHRoaXMuX3BbMF0ueCArICh5IC0gdGhpcy5fcFswXS55KSAqICh0aGlzLmR4KSAvICh0aGlzLmR5KVxuICB9XG4gIFxuICBjb250YWlucyhwKSB7XG4gICAgbGV0IG9uTGluZSA9ICh0aGlzLmR4ICE9PSAwKSA/ICh0aGlzLnkocC54KSA9PT0gcC55KSA6ICh0aGlzLngocC55KSA9PT0gcC54KTtcbiAgICByZXR1cm4gb25MaW5lICYmICghdGhpcy5fY2xpcCB8fCBcbiAgICAgICgodGhpcy5sZWZ0IDw9IHAueCAmJiBwLnggPD0gdGhpcy5yaWdodCkgJiZcbiAgICAgICh0aGlzLnRvcCA8PSBwLnkgJiYgcC55IDw9IHRoaXMuYm90dG9tKSkpO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdMaW5lJyArIHN1cGVyLnRvU3RyaW5nKCkgKyAnWycgK1xuICAgICAgdGhpcy5fcFswXS50b1N0cmluZygpICsgJzsnICsgdGhpcy5fcFsxXS50b1N0cmluZygpICtcbiAgICAgICddJztcbiAgfVxufVxuICAgICAgICBcbm1vZHVsZS5leHBvcnRzID0gTGluZTtcbiIsImxldCBHZW9tID0gcmVxdWlyZSgnLi9nZW9tJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBQb2ludCBleHRlbmRzIEdlb20ge1xuICBjb25zdHJ1Y3RvcihuYW1lLCB4LCB5KSB7XG4gICAgc3VwZXIobmFtZSk7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuZnJlZSA9IHRydWU7XG4gIH1cbiAgXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBzdXBlci50b1N0cmluZygpICsgJygnICsgdGhpcy54ICsgJywnICsgdGhpcy55ICsgJyknO1xuICB9XG4gIFxuICAvKiBzaG9ydGhhbmQgZnVuY3Rpb24gZm9yIGNvbnN0cnVjdGluZyBhIHBvaW50IGZyb20gY29vZGluYXRlcyAqL1xuICBzdGF0aWMgUChuYW1lLCB4LCB5KSB7XG4gICAgaWYoIXkpIHtcbiAgICAgIHkgPSB4O1xuICAgICAgeCA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQb2ludChudWxsLCB4LCB5KTtcbiAgfVxufVxuIiwibGV0IFAgPSByZXF1aXJlKCcuL3BvaW50JykuUCxcbiAgICBMaW5lID0gcmVxdWlyZSgnLi9saW5lJyksXG4gICAge2Rpc3RhbmNlU3F1YXJlZCwgZGlzdGFuY2V9ID0gcmVxdWlyZSgnLi4vY2FsYycpO1xuXG5jbGFzcyBTZWdtZW50IGV4dGVuZHMgTGluZSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUsIHAxLCBwMikge1xuICAgIHN1cGVyKG5hbWUsIHAxLCBwMik7XG4gICAgdGhpcy5fY2xpcCA9IHRydWU7XG4gICAgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgcDoge1xuICAgICAgICAvLyBUT0RPOiBjbG9uZSBwb2ludCB0aGVtc2VsdmVzP1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh0aGlzLl9wKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgbGVuZ3Roc3E6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBkaXN0YW5jZVNxdWFyZWQodGhpcy5fcFswXSwgdGhpcy5fcFsxXSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcbiAgICAgIGxlbmd0aDoge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGRpc3RhbmNlKHRoaXMuX3BbMF0sIHRoaXMuX3BbMV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuICBcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdTZWdtZW50JyArIHN1cGVyLnRvU3RyaW5nKCk7XG4gIH1cbiAgXG4gIC8qXG4gIGNsaXAgdGhlIGdpdmVuIGxpbmUgKG9yIGxpbmUgc2VnbWVudCkgdG8gdGhlIGdpdmVuIGJvdW5kaW5nIGJveCwgd2hlcmUgYGJvdW5kc2BcbiAgbXVzdCBoYXZlIGBsZWZ0YCwgYHJpZ2h0YCwgYHRvcGAsIGFuZCBgYm90dG9tYCBwcm9wZXJ0aWVzLlxuICAqL1xuICBzdGF0aWMgY2xpcChib3VuZHMsIGxpbmUpIHtcbiAgICB2YXIgW3AxLCBwMl0gPSBsaW5lLl9wO1xuICAgIFxuICAgIHZhciBsZWZ0ID0gbGluZS55KGJvdW5kcy5sZWZ0KSxcbiAgICByaWdodCA9IGxpbmUueShib3VuZHMucmlnaHQpLFxuICAgIHRvcCA9IGxpbmUueChib3VuZHMudG9wKSxcbiAgICBib3R0b20gPSBsaW5lLngoYm91bmRzLmJvdHRvbSk7XG4gICAgXG4gICAgaWYgKHAxLnggPiBwMi54KSB7XG4gICAgICBsZXQgdCA9IHAxO1xuICAgICAgcDEgPSBwMjtcbiAgICAgIHAyID0gdDtcbiAgICB9XG4gICAgaWYgKGxlZnQgJiYgbGVmdCA+PSBib3VuZHMudG9wICYmIGxlZnQgPD0gYm91bmRzLmJvdHRvbSkge1xuICAgICAgLy8gaW50ZXJzZWN0cyBsZWZ0IHdhbGxcbiAgICAgIHAxID0gUChib3VuZHMubGVmdCwgbGVmdCk7XG4gICAgfVxuICAgIGlmIChyaWdodCAmJiByaWdodCA+PSBib3VuZHMudG9wICYmIHJpZ2h0IDw9IGJvdW5kcy5ib3R0b20pIHtcbiAgICAgIC8vIGludGVyc2VjdHMgcmlnaHQgd2FsbFxuICAgICAgcDIgPSBQKGJvdW5kcy5yaWdodCwgcmlnaHQpO1xuICAgIH1cbiAgICBcbiAgICBpZiAocDEueSA+IHAyLnkpIHtcbiAgICAgIGxldCB0ID0gcDE7XG4gICAgICBwMSA9IHAyO1xuICAgICAgcDIgPSB0O1xuICAgIH1cbiAgICBpZiAodG9wICYmIHRvcCA+PSBib3VuZHMubGVmdCAmJiB0b3AgPD0gYm91bmRzLnJpZ2h0KSB7XG4gICAgICAvLyBpbnRlcnNlY3RzIHRvcCB3YWxsXG4gICAgICBwMSA9IFAodG9wLCBib3VuZHMudG9wKTtcbiAgICB9XG4gICAgaWYgKGJvdHRvbSAmJiBib3R0b20gPj0gYm91bmRzLmxlZnQgJiYgYm90dG9tIDw9IGJvdW5kcy5yaWdodCkge1xuICAgICAgLy8gaW50ZXJzZWN0cyBib3R0b20gd2FsbFxuICAgICAgcDIgPSBQKGJvdHRvbSwgYm91bmRzLmJvdHRvbSk7XG4gICAgfVxuICAgIFxuICAgIGxldCBjbGlwcGVkID0gbmV3IFNlZ21lbnQobnVsbCwgcDEsIHAyKTtcbiAgICBjbGlwcGVkLnBhcmVudCA9IGxpbmU7XG4gICAgcmV0dXJuIGNsaXBwZWQ7XG4gIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlZ21lbnQ7XG4iLCJcbmxldCBkMyA9IHJlcXVpcmUoJ2QzJylcbmxldCB7IFBvaW50LCBDaXJjbGUsIFNlZ21lbnQsIExpbmUgfSA9IHJlcXVpcmUoJy4vbW9kZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbmRlcmVyO1xuXG5mdW5jdGlvbiByZW5kZXJlcihzY2VuZSwgc3ZnRWxlbWVudCkge1xuICBsZXQgc3ZnID0gZDMuc2VsZWN0KHN2Z0VsZW1lbnQpO1xuXG4gIGZ1bmN0aW9uIHBvaW50KCkge1xuICAgIHRoaXMuYXR0cignY2xhc3MnLCBrbGFzc2VzKCdwb2ludCcpIClcbiAgICAuYXR0cignY3gnLCBkPT5kLngpXG4gICAgLmF0dHIoJ2N5JywgZD0+ZC55KVxuICAgIC5hdHRyKCdyJywgZD0+NSlcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBcbiAgZnVuY3Rpb24ga2xhc3NlcygpIHtcbiAgICBsZXQgaW5pdCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgcmV0dXJuIGQgPT4gaW5pdC5jb25jYXQoZC5jbGFzc2VzID8gZC5jbGFzc2VzLnZhbHVlcygpIDogW10pLmpvaW4oJyAnKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIC8qIGNpcmNsZXMgKi9cbiAgICBsZXQgY2lyY2xlcyA9IHN2Zy5zZWxlY3RBbGwoJ2cuY2lyY2xlJylcbiAgICAuZGF0YShzY2VuZS5vYmplY3RzKCkuZmlsdGVyKGQgPT4gZCBpbnN0YW5jZW9mIENpcmNsZSkpO1xuXG4gICAgbGV0IGNpcmNsZUdyb3VwID0gY2lyY2xlcy5lbnRlcigpLmFwcGVuZCgnZycpXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnY2lyY2xlJykpXG4gICAgLmNhbGwoaG92ZXIpO1xuICAgIGNpcmNsZUdyb3VwLmFwcGVuZCgnY2lyY2xlJykuYXR0cignY2xhc3MnLCAnaGFuZGxlJyk7XG4gICAgY2lyY2xlR3JvdXAuYXBwZW5kKCdjaXJjbGUnKS5hdHRyKCdjbGFzcycsICd2aXNpYmxlJyk7XG5cbiAgICBjaXJjbGVzXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnY2lyY2xlJykpXG4gICAgLnNlbGVjdEFsbCgnY2lyY2xlJylcbiAgICAuYXR0cignY3gnLCBkID0+IGQuY2VudGVyLngpXG4gICAgLmF0dHIoJ2N5JywgZCA9PiBkLmNlbnRlci55KVxuICAgIC5hdHRyKCdyJywgZCA9PiBkLnJhZGl1cylcbiAgICBcbiAgICBjaXJjbGVzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICBcbiAgICAvKiBsaW5lcyAqL1xuICAgIGxldCBsaW5lcyA9IHN2Zy5zZWxlY3RBbGwoJ2cubGluZScpXG4gICAgLmRhdGEoc2NlbmUub2JqZWN0cygpLmZpbHRlcihkPT5kIGluc3RhbmNlb2YgTGluZSkpO1xuICAgIFxuICAgIGxldCBsaW5lR3JvdXAgPSBsaW5lcy5lbnRlcigpLmFwcGVuZCgnZycpXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnbGluZScpKVxuICAgIC5jYWxsKGhvdmVyKTtcbiAgICBsaW5lR3JvdXAuZmlsdGVyKGQ9PmQgaW5zdGFuY2VvZiBTZWdtZW50KVxuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2xpbmUnLCAnc2VnbWVudCcpKVxuICAgIGxpbmVHcm91cC5hcHBlbmQoJ2xpbmUnKS5hdHRyKCdjbGFzcycsICdoYW5kbGUnKTtcbiAgICBsaW5lR3JvdXAuYXBwZW5kKCdsaW5lJykuYXR0cignY2xhc3MnLCAndmlzaWJsZScpO1xuICAgIFxuICAgIC8vIFRPRE86IHRoaXMgaXMgZ3Jvc3NseSBpbmVmZmljaWVudFxuICAgIGZ1bmN0aW9uIGVuZHBvaW50KGluZGV4LCBjb29yZCkge1xuICAgICAgcmV0dXJuIGQ9PntcbiAgICAgICAgbGV0IHMgPSBkIGluc3RhbmNlb2YgU2VnbWVudCA/IGQgOiBTZWdtZW50LmNsaXAoc2NlbmUuYm91bmRzLCBkKTtcbiAgICAgICAgcmV0dXJuIHMucFtpbmRleF1bY29vcmRdO1xuICAgICAgfVxuICAgIH1cbiAgICAgIFxuICAgIGxpbmVzXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnbGluZScpKVxuICAgIC5zZWxlY3RBbGwoJ2xpbmUnKVxuICAgIC5hdHRyKCd4MScsIGVuZHBvaW50KDAsJ3gnKSlcbiAgICAuYXR0cigneTEnLCBlbmRwb2ludCgwLCd5JykpXG4gICAgLmF0dHIoJ3gyJywgZW5kcG9pbnQoMSwneCcpKVxuICAgIC5hdHRyKCd5MicsIGVuZHBvaW50KDEsJ3knKSlcbiAgICBcbiAgICBsaW5lcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgXG4gICAgLyogcG9pbnRzICovXG4gICAgbGV0IHBvaW50cyA9IHN2Zy5zZWxlY3RBbGwoJ2NpcmNsZS5wb2ludCcpXG4gICAgLmRhdGEoc2NlbmUub2JqZWN0cygpLmZpbHRlcihkPT5kIGluc3RhbmNlb2YgUG9pbnQpKVxuICAgIC5zb3J0KChhLGIpPT4oYS5mcmVlID8gMSA6IDApIC0gKGIuZnJlZSA/IDEgOiAwKSlcbiAgICBwb2ludHMuZW50ZXIoKS5hcHBlbmQoJ2NpcmNsZScpXG4gICAgcG9pbnRzLmNhbGwocG9pbnQpXG4gICAgLmNhbGwoaG92ZXIpO1xuICAgIFxuICAgIHBvaW50cy5leGl0KCkucmVtb3ZlKCk7XG4gICAgXG5cbiAgICAvKiBhdHRhY2ggXCJhY3RpdmVcIiBjbGFzcyBvbiBob3ZlciAqL1xuICAgIGZ1bmN0aW9uIG1vdXNlb3ZlcigpIHsgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2FjdGl2ZScsIHRydWUpOyB9XG4gICAgZnVuY3Rpb24gbW91c2VvdXQoKSB7IGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdhY3RpdmUnLCBmYWxzZSk7IH1cbiAgICBmdW5jdGlvbiBob3ZlcigpIHtcbiAgICAgIHRoaXMub24oJ21vdXNlb3ZlcicsIG1vdXNlb3Zlcikub24oJ21vdXNlb3V0JywgbW91c2VvdXQpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSAgICBcbiAgfVxuXG4gIHJldHVybiByZW5kZXI7XG59XG4iLCJcbmxldCBkMyA9IHJlcXVpcmUoJ2QzJyksIC8vIFRPRE86IHJlbW92ZSBkZXA7IG9ubHkgYmVpbmcgdXNlZCBmb3IgZDMubWFwKCkgYW5kIGQzLnNldCgpLlxuICAgIHBhcnNlciA9IHJlcXVpcmUoJ2V1Y2xpZC1wYXJzZXInKSxcbiAgICB7XG4gICAgICBQb2ludCxcbiAgICAgIExpbmUsXG4gICAgICBTZWdtZW50LFxuICAgICAgQ2lyY2xlLFxuICAgICAgZXF1YWxXaXRoaW5cbiAgICB9ID0gcmVxdWlyZSgnLi9tb2RlbCcpLFxuICAgIEludGVyc2VjdGlvbiA9IHJlcXVpcmUoJy4vbW9kZWwvaW50ZXJzZWN0aW9uJyk7XG5cblxuZnVuY3Rpb24gYWRkQ2xhc3Mob2JqLCBrbGFzcykge1xuICBvYmouY2xhc3NlcyA9IG9iai5jbGFzc2VzIHx8IGQzLnNldCgpO1xuICBvYmouY2xhc3Nlcy5hZGQoa2xhc3MpO1xufVxuXG5jbGFzcyBTY2VuZSB7XG4gIFxuICBjb25zdHJ1Y3Rvcihib3VuZHMpIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmJvdW5kcy53aWR0aCA9IHRoaXMuYm91bmRzLnJpZ2h0IC0gdGhpcy5ib3VuZHMubGVmdDtcbiAgICB0aGlzLmJvdW5kcy5oZWlnaHQgPSB0aGlzLmJvdW5kcy5ib3R0b20gLSB0aGlzLmJvdW5kcy50b3A7XG5cbiAgICB0aGlzLl9vYmplY3RzID0gZDMubWFwKCk7XG4gICAgdGhpcy5faW50ZXJzZWN0aW9ucyA9IGQzLm1hcCgpO1xuICAgIHRoaXMuZXF1YWwgPSBlcXVhbFdpdGhpbihNYXRoLnNxcnQoMikpO1xuICAgIHRoaXMubG9nID0gW107XG4gIH1cbiAgXG4gIFxuICBwYXJzZSh0ZXh0LCBjYikge1xuICAgIGxldCBwYXJzZWRPYmplY3RzID0gW10sXG4gICAgICAgIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIFxuICAgIHRyeSB7XG4gICAgICAvKiBwYXJzZSBcIltncm91cGluZ11cIiBzdGF0ZW1lbnRzIGRpcmVjdGx5LCBhbmQgZ2VvbWV0cnkgZGVjbGFyYXRpb25zIHVzaW5nXG4gICAgICAgKiB0aGUgZXVjbGlkLXBhcnNlciBwYXJzZXIuICovXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGluZXNbaV0gPSBsaW5lc1tpXS50cmltKCk7XG4gICAgICAgIGlmKC9eXFxbLipcXF0kLy50ZXN0KGxpbmVzW2ldKSlcbiAgICAgICAgICBwYXJzZWRPYmplY3RzLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogJ2dyb3VwJyxcbiAgICAgICAgICAgIG5hbWU6IGxpbmVzW2ldLnNsaWNlKDEsIC0xKVxuICAgICAgICAgIH0pO1xuICAgICAgICBlbHNlIGlmKGxpbmVzW2ldLmxlbmd0aCA+IDApXG4gICAgICAgICAgcGFyc2VkT2JqZWN0cy5wdXNoKHBhcnNlci5wYXJzZShsaW5lc1tpXSlbMF0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvKiByZW1vdmUgZnJvbSBzY2VuZSBhbnkgZXhpc3Rpbmcgb2JqZWN0cyB0aGF0IHdlcmVuJ3QgZGVjbGFyZWQgaW4gdGhlIHBhcnNlZCB0ZXh0ICovXG4gICAgICBsZXQgcGFyc2VkTmFtZXMgPSBwYXJzZWRPYmplY3RzLm1hcChvID0+IG8ubmFtZSk7XG4gICAgICB0aGlzLl9vYmplY3RzLmtleXMoKVxuICAgICAgLmZpbHRlcihuYW1lID0+IHBhcnNlZE5hbWVzLmluZGV4T2YobmFtZSkgPCAwKVxuICAgICAgLmZvckVhY2gobmFtZSA9PiB0aGlzLl9vYmplY3RzLnJlbW92ZShuYW1lKSk7XG4gICAgICBcbiAgICAgIC8qIG5vdyB1cGRhdGUgc2NlbmUgd2l0aCBwYXJzZWQgb2JqZWN0cyAqL1xuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHBhcnNlZE9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IGl0ZW0gPSBwYXJzZWRPYmplY3RzW2ldO1xuXG4gICAgICAgIHN3aXRjaChpdGVtLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdncm91cCc6XG4gICAgICAgICAgICB0aGlzLmdyb3VwKGl0ZW0ubmFtZSk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3BvaW50JzpcbiAgICAgICAgICAgIHRoaXMucG9pbnQoaXRlbS5uYW1lLCBpdGVtLngsIGl0ZW0ueSk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2xpbmUnOlxuICAgICAgICAgICAgdGhpcy5saW5lKGl0ZW0ubmFtZSwgaXRlbS5wMSwgaXRlbS5wMik7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3NlZ21lbnQnOlxuICAgICAgICAgICAgdGhpcy5zZWdtZW50KGl0ZW0ubmFtZSwgaXRlbS5wMSwgaXRlbS5wMik7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICAgICAgICB0aGlzLmNpcmNsZShpdGVtLm5hbWUsIGl0ZW0uY2VudGVyLCBpdGVtLmJvdW5kYXJ5UG9pbnQpOyBicmVhaztcbiAgICAgICAgICBjYXNlICdpbnRlcnNlY3Rpb24nOlxuICAgICAgICAgICAgbGV0IHdoaWNoID0gMDtcbiAgICAgICAgICAgIGlmKGl0ZW0ud2hpY2ggJiYgaXRlbS53aGljaC5vcCA9PT0gJ25vdCcpXG4gICAgICAgICAgICAgIHdoaWNoID0gdGhpcy5pc250KGl0ZW0ud2hpY2guYXJnc1swXSk7XG4gICAgICAgICAgICB0aGlzLmludGVyc2VjdGlvbihpdGVtLm5hbWUsIGl0ZW0ubzEsIGl0ZW0ubzIsIHdoaWNoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcblxuICAgICAgaWYoY2IpIGNiKHRydWUpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgaWYoY2IpIGNiKG51bGwsIGUpO1xuICAgIH1cbiAgfVxuICBcbiAgLyogcmV0dXJuIGFuIGFycmF5IG9mIGFsbCBQb2ludHMgaW4gdGhlIHNjZW5lICovXG4gIHBvaW50cygpIHtcbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKS5maWx0ZXIobyA9PiBvIGluc3RhbmNlb2YgUG9pbnQpXG4gIH1cbiAgXG4gIC8qIHJldHVybiBhbiBhcnJheSBvZiBhbGwgb2JqZWN0cyBpbiB0aGUgc2NlbmUgKi9cbiAgb2JqZWN0cygpIHtcbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKTtcbiAgfVxuICBcbiAgLyogZmluZCB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGluIHRoZSBzY2VuZSB1c2luZyBnZW9tZXRyaWNcbiAgKGkuZS4gZGVlcCkgZXF1YWxpdHkgcmF0aGVyIHRoYW4gcmVmZXJlbmNlID09PS4gKi9cbiAgZmluZChvYmopIHtcbiAgICBsZXQgb2JqZWN0cyA9IHRoaXMuX29iamVjdHMudmFsdWVzKCk7XG4gICAgZm9yKGxldCBpID0gMDsgaSA8IG9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHRoaXMuZXF1YWwob2JqZWN0c1tpXSwgb2JqKSkgcmV0dXJuIG9iamVjdHNbaV07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICAvKiogIFxuICAgKiBpcyAtIEdldCBhbiBlcXVhbGl0eS10ZXN0aW5nIGNhbGxiYWNrIGZvciB0aGUgZ2l2ZW4gb2JqZWN0LiAgXG4gICAqICAgIFxuICAgKiBAcGFyYW0gIHtHZW9tfHN0cmluZ30gb2JqIEVpdGhlciB0aGUgbmFtZSBvZiB0aGUgb2JqZWN0IHRvIHRlc3Qgb3IgdGhlIG9iamVjdCBpdHNlbGYuXG4gICAqIEByZXR1cm4ge0dlb21+Ym9vbGVhbn0gYSBmdW5jdGlvbiB0aGF0IHRlc3RzIHdoZXRoZXIgaXRzIGFyZ3VtZW50IGlzIGdlb21ldHJpY2FsbHkgZXF1YWwgdG8gb2JqLlxuICAgKi8gICBcbiAgaXMob2JqKSB7XG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHsgb2JqID0gdGhpcy5nZXQob2JqKTsgfVxuICAgIHJldHVybiAoc2Vjb25kT2JqKSA9PiAob2JqICYmIHRoaXMuZXF1YWwob2JqLCBzZWNvbmRPYmopKTtcbiAgfVxuICBcbiAgLyoqICBcbiAgKiBpcyAtIEdldCBhbiBOT04tZXF1YWxpdHktdGVzdGluZyBjYWxsYmFjayBmb3IgdGhlIGdpdmVuIG9iamVjdC4gIFxuICAqICAgIFxuICAqIEBwYXJhbSAge0dlb218c3RyaW5nfSBvYmogRWl0aGVyIHRoZSBuYW1lIG9mIHRoZSBvYmplY3QgdG8gdGVzdCBvciB0aGUgb2JqZWN0IGl0c2VsZi5cbiAgKiBAcmV0dXJuIHtHZW9tfmJvb2xlYW59IGEgZnVuY3Rpb24gdGhhdCB0ZXN0cyB3aGV0aGVyIGl0cyBhcmd1bWVudCBpcyBOT1QgZ2VvbWV0cmljYWxseSBlcXVhbCB0byBvYmouXG4gICovICAgXG4gIGlzbnQob2JqKSB7XG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHsgb2JqID0gdGhpcy5nZXQob2JqKTsgfVxuICAgIHJldHVybiAoc2Vjb25kT2JqKSA9PiAob2JqICYmICF0aGlzLmVxdWFsKG9iaiwgc2Vjb25kT2JqKSk7XG4gIH1cbiAgXG4gIGZyZWVOYW1lKCkge1xuICAgIC8vIFRPRE86IHRoaXMgaXMgZ29ubmEgZ2V0IHdlaXJkIGlmIHdlIGdvIGFib3ZlIDI2LlxuICAgIGxldCBtYXggPSAnQScuY2hhckNvZGVBdCgwKSAtIDEsXG4gICAga2V5cyA9IHRoaXMuX29iamVjdHMua2V5cygpO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihrZXlzW2ldLmxlbmd0aCA9PT0gMSlcbiAgICAgICAgbWF4ID0gTWF0aC5tYXgoa2V5c1tpXS5jaGFyQ29kZUF0KDApLCBtYXgpO1xuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShtYXgrMSk7XG4gIH1cbiAgXG5cbiAgYWRkKG9iamVjdCkge1xuICAgIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSB0aGlzIG9iamVjdCwgYW5kIGl0J3MgdGhlIHNhbWUgdHlwZSwgdGhlbiB1cGRhdGUgdGhlXG4gICAgLy8gZXhpc3Rpbmcgb25lIGluIHBsYWNlLlxuICAgIGxldCBleGlzdGluZyA9IHRoaXMuX29iamVjdHMuZ2V0KG9iamVjdC5uYW1lKTtcbiAgICBpZiAoZXhpc3RpbmcgJiYgZXhpc3RpbmcuY29uc3RydWN0b3IubmFtZSA9PT0gb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgIGZvcihsZXQgcHJvcCBpbiBvYmplY3QpIGV4aXN0aW5nW3Byb3BdID0gb2JqZWN0W3Byb3BdO1xuICAgICAgb2JqZWN0ID0gZXhpc3Rpbmc7XG4gICAgfVxuICAgIC8vIGlmIGEgZ2VvbWV0cmljYWxseSBlcXVpdmFsZW50IG9iamVjdCBleGlzdHMsIGRvIG5vdGhpbmcuXG4gICAgZWxzZSBpZihleGlzdGluZyA9IHRoaXMuZmluZChvYmplY3QpKSB7XG4gICAgICBjb25zb2xlLmxvZygnVHJpZWQgdG8gYWRkICcrb2JqZWN0KycgYnV0ICcrZXhpc3RpbmcrJyBpcyBhbHJlYWR5IGluIHNjZW5lLicpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8vIGFkZCBhIG5ldyBvYmplY3QgdG8gdGhlIHNjZW5lLlxuICAgIGVsc2Uge1xuICAgICAgb2JqZWN0Lm5hbWUgPSBvYmplY3QubmFtZSB8fCB0aGlzLmZyZWVOYW1lKCk7XG4gICAgICB0aGlzLl9vYmplY3RzLnNldChvYmplY3QubmFtZSwgb2JqZWN0KTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHRoaXMuX2N1cnJlbnRUYWcpIGFkZENsYXNzKG9iamVjdCwgdGhpcy5fY3VycmVudFRhZyk7XG4gICAgaWYgKG9iamVjdC5mcmVlKSBhZGRDbGFzcyhvYmplY3QsICdmcmVlLXBvaW50Jyk7XG4gICAgXG4gICAgdGhpcy51cGRhdGUob2JqZWN0KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBnZXQobmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9vYmplY3RzLmdldChuYW1lKTtcbiAgfVxuICBcbiAgcG9pbnQobmFtZSwgeCwgeSkge1xuICAgIGlmKCF5KSB7XG4gICAgICB5ID0geDtcbiAgICAgIHggPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZChuZXcgUG9pbnQobmFtZSwgeCwgeSkpO1xuICB9XG4gIFxuICBjaXJjbGUobmFtZSwgY2VudGVySWQsIGJvdW5kYXJ5SWQpIHtcbiAgICBpZighYm91bmRhcnlJZCkge1xuICAgICAgYm91bmRhcnlJZCA9IGNlbnRlcklkO1xuICAgICAgY2VudGVySWQgPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZChuZXcgQ2lyY2xlKG5hbWUsIHRoaXMuZ2V0KGNlbnRlcklkKSwgdGhpcy5nZXQoYm91bmRhcnlJZCkpKTtcbiAgfVxuICBcbiAgc2VnbWVudChuYW1lLCBpZDEsIGlkMikge1xuICAgIGlmKCFpZDIpIHtcbiAgICAgIGlkMiA9IGlkMTtcbiAgICAgIGlkMSA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBTZWdtZW50KG5hbWUsIHRoaXMuZ2V0KGlkMSksIHRoaXMuZ2V0KGlkMikpKTtcbiAgfVxuICBcbiAgbGluZShuYW1lLCBpZDEsIGlkMikge1xuICAgIGlmKCFpZDIpIHtcbiAgICAgIGlkMiA9IGlkMTtcbiAgICAgIGlkMSA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBMaW5lKG5hbWUsIHRoaXMuZ2V0KGlkMSksIHRoaXMuZ2V0KGlkMikpKTtcbiAgfVxuICBcbiAgaW50ZXJzZWN0aW9uKG5hbWUsIGlkMSwgaWQyLCB3aGljaCkge1xuICAgIGlmKHR5cGVvZiBpZDIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZDIgPSBpZDE7XG4gICAgICBpZDEgPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuXG4gICAgbGV0IG8xID0gdGhpcy5nZXQoaWQxKSxcbiAgICAgICAgbzIgPSB0aGlzLmdldChpZDIpO1xuICAgIGlmKCFvMSkgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZmluZCBvYmplY3QgXCIraWQxKTtcbiAgICBpZighbzIpIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGZpbmQgb2JqZWN0IFwiK2lkMik7XG5cbiAgICByZXR1cm4gdGhpcy5hZGQobmV3IEludGVyc2VjdGlvbihuYW1lLCBvMSwgbzIsIHdoaWNoKSk7XG4gIH1cbiAgXG4gIGdyb3VwKHRhZykge1xuICAgIHRoaXMuX2N1cnJlbnRUYWcgPSB0YWc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIC8qKiAgXG4gICAqIHVwZGF0ZSAtIFVwZGF0ZSBvYmplY3RzIHRvIHJlZmxlY3QgY2hhbmdlcyBpbiBkZXBlbmRlbnQgb2JqZWN0cy4gKEUuZy4sXG4gICAqIHVwZGF0ZSBJbnRlcnNlY3Rpb24gY29vcmRpbmF0ZXMgd2hlbiB0aGUgaW50ZXJzZWN0ZWQgb2JqZWN0cyBoYXZlIGNoYW5nZWQuKVxuICAgKiAgICBcbiAgICogQHBhcmFtIHtHZW9tfSByb290IFRoZSBvYmplY3QgZnJvbSB3aGljaCB0byBzdGFydCB3YWxraW5nIHRoZSBkZXBlbmRlbmN5IGdyYXBoLiAgXG4gICAqL1xuICAvLyBUT0RPOiByZXNwZWN0IGByb290YCBwYXJhbWV0ZXIsIGFuZCBkbyBhbiBhY3R1YWwgREFHIHdhbGsuXG4gIHVwZGF0ZShyb290KSB7XG4gICAgdGhpcy5fb2JqZWN0cy52YWx1ZXMoKVxuICAgICAgLmZpbHRlcihvYmogPT4gb2JqIGluc3RhbmNlb2YgSW50ZXJzZWN0aW9uKVxuICAgICAgLmZvckVhY2gob2JqID0+IG9iai51cGRhdGUoKSlcbiAgfVxuICBcbiAgbG9nU3RhdGUobGFiZWwpIHtcbiAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgbGV0IG9iamVjdHMgPSB0aGlzLl9vYmplY3RzLnZhbHVlcygpO1xuICAgIGxldCBwb2ludHMgPSB0aGlzLnBvaW50cygpO1xuXG4gICAgbGV0IHN0YXRlID0ge1xuICAgICAgbGFiZWwsXG4gICAgICB0aW1lOiAobmV3IERhdGUoKSkudG9TdHJpbmcoKSxcbiAgICAgIG9iamVjdHM6IG9iamVjdHMubWFwKG8gPT4gby50b1N0cmluZygpKSxcbiAgICAgIGludGVyc2VjdGlvbnM6IHRoaXMuX2ludGVyc2VjdGlvbnMua2V5cygpXG4gICAgfVxuICAgIHRoaXMubG9nLnB1c2goc3RhdGUpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NlbmU7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgLypcbiAgICogR2VuZXJhdGVkIGJ5IFBFRy5qcyAwLjguMC5cbiAgICpcbiAgICogaHR0cDovL3BlZ2pzLm1hamRhLmN6L1xuICAgKi9cblxuICBmdW5jdGlvbiBwZWckc3ViY2xhc3MoY2hpbGQsIHBhcmVudCkge1xuICAgIGZ1bmN0aW9uIGN0b3IoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfVxuICAgIGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgY3RvcigpO1xuICB9XG5cbiAgZnVuY3Rpb24gU3ludGF4RXJyb3IobWVzc2FnZSwgZXhwZWN0ZWQsIGZvdW5kLCBvZmZzZXQsIGxpbmUsIGNvbHVtbikge1xuICAgIHRoaXMubWVzc2FnZSAgPSBtZXNzYWdlO1xuICAgIHRoaXMuZXhwZWN0ZWQgPSBleHBlY3RlZDtcbiAgICB0aGlzLmZvdW5kICAgID0gZm91bmQ7XG4gICAgdGhpcy5vZmZzZXQgICA9IG9mZnNldDtcbiAgICB0aGlzLmxpbmUgICAgID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiAgID0gY29sdW1uO1xuXG4gICAgdGhpcy5uYW1lICAgICA9IFwiU3ludGF4RXJyb3JcIjtcbiAgfVxuXG4gIHBlZyRzdWJjbGFzcyhTeW50YXhFcnJvciwgRXJyb3IpO1xuXG4gIGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHt9LFxuXG4gICAgICAgIHBlZyRGQUlMRUQgPSB7fSxcblxuICAgICAgICBwZWckc3RhcnRSdWxlRnVuY3Rpb25zID0geyBzdGFydDogcGVnJHBhcnNlc3RhcnQgfSxcbiAgICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uICA9IHBlZyRwYXJzZXN0YXJ0LFxuXG4gICAgICAgIHBlZyRjMCA9IFtdLFxuICAgICAgICBwZWckYzEgPSBwZWckRkFJTEVELFxuICAgICAgICBwZWckYzIgPSBudWxsLFxuICAgICAgICBwZWckYzMgPSAvXlsuXFxuXS8sXG4gICAgICAgIHBlZyRjNCA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbLlxcXFxuXVwiLCBkZXNjcmlwdGlvbjogXCJbLlxcXFxuXVwiIH0sXG4gICAgICAgIHBlZyRjNSA9IGZ1bmN0aW9uKG5hbWUsIG9iaikgeyByZXR1cm4gd2l0aE5hbWUob2JqLCBuYW1lKTsgfSxcbiAgICAgICAgcGVnJGM2ID0gZnVuY3Rpb24obmFtZSkge3JldHVybiBuYW1lO30sXG4gICAgICAgIHBlZyRjNyA9IGZ1bmN0aW9uKG9iaiwgbmFtZSkgeyByZXR1cm4gd2l0aE5hbWUob2JqLCBuYW1lKTsgfSxcbiAgICAgICAgcGVnJGM4ID0gL15bIF0vLFxuICAgICAgICBwZWckYzkgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiWyBdXCIsIGRlc2NyaXB0aW9uOiBcIlsgXVwiIH0sXG4gICAgICAgIHBlZyRjMTAgPSBcIihcIixcbiAgICAgICAgcGVnJGMxMSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIihcIiwgZGVzY3JpcHRpb246IFwiXFxcIihcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMiA9IFwiLFwiLFxuICAgICAgICBwZWckYzEzID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiLFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiLFxcXCJcIiB9LFxuICAgICAgICBwZWckYzE0ID0gXCIpXCIsXG4gICAgICAgIHBlZyRjMTUgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIpXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIpXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTYgPSBmdW5jdGlvbih4LCB5KSB7IHJldHVybiB7dHlwZTogJ3BvaW50JywgeDp4LCB5Onl9OyB9LFxuICAgICAgICBwZWckYzE3ID0gZnVuY3Rpb24oY2VudGVyLCBib3VuZGFyeVBvaW50KSB7IHJldHVybiB7dHlwZTogJ2NpcmNsZScsIGNlbnRlcjogY2VudGVyLCBib3VuZGFyeVBvaW50OiBib3VuZGFyeVBvaW50IH07IH0sXG4gICAgICAgIHBlZyRjMTggPSBmdW5jdGlvbihwMSwgcDIpIHsgcmV0dXJuIHt0eXBlOiAnbGluZScsIHAxOiBwMSwgcDI6IHAyIH07IH0sXG4gICAgICAgIHBlZyRjMTkgPSBmdW5jdGlvbihsaW5lKSB7IHJldHVybiBsaW5lOyB9LFxuICAgICAgICBwZWckYzIwID0gZnVuY3Rpb24ocDEsIHAyKSB7IHJldHVybiB7dHlwZTogJ3NlZ21lbnQnLCBwMTogcDEsIHAyOiBwMiB9OyB9LFxuICAgICAgICBwZWckYzIxID0gXCJ3aXRoIGVuZHBvaW50c1wiLFxuICAgICAgICBwZWckYzIyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwid2l0aCBlbmRwb2ludHNcIiwgZGVzY3JpcHRpb246IFwiXFxcIndpdGggZW5kcG9pbnRzXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjMgPSBmdW5jdGlvbihzZWcpIHsgcmV0dXJuIHNlZzsgfSxcbiAgICAgICAgcGVnJGMyNCA9IGZ1bmN0aW9uKG8xLCBvMiwgd2hpY2gpIHsgcmV0dXJuIHt0eXBlOiAnaW50ZXJzZWN0aW9uJywgbzE6IG8xLCBvMjogbzIsIHdoaWNoOiB3aGljaH07IH0sXG4gICAgICAgIHBlZyRjMjUgPSBmdW5jdGlvbihjb25kKSB7IHJldHVybiB7IG9wOiBjb25kWzBdLCBhcmdzOiBbY29uZFsxXV0gfSB9LFxuICAgICAgICBwZWckYzI2ID0gXCJhXCIsXG4gICAgICAgIHBlZyRjMjcgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJhXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJhXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjggPSBcImFuXCIsXG4gICAgICAgIHBlZyRjMjkgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJhblwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYW5cXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzMCA9IGZ1bmN0aW9uKHIpIHsgcmV0dXJuIHI7IH0sXG4gICAgICAgIHBlZyRjMzEgPSBcIj1cIixcbiAgICAgICAgcGVnJGMzMiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIj1cIiwgZGVzY3JpcHRpb246IFwiXFxcIj1cXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzMyA9IFwiYmVcIixcbiAgICAgICAgcGVnJGMzNCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImJlXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJiZVxcXCJcIiB9LFxuICAgICAgICBwZWckYzM1ID0gXCJlcXVhbFwiLFxuICAgICAgICBwZWckYzM2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiZXF1YWxcIiwgZGVzY3JpcHRpb246IFwiXFxcImVxdWFsXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMzcgPSBcImJ5XCIsXG4gICAgICAgIHBlZyRjMzggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJieVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYnlcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzOSA9IFwiaXNcIixcbiAgICAgICAgcGVnJGM0MCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImlzXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJpc1xcXCJcIiB9LFxuICAgICAgICBwZWckYzQxID0gXCJpdFwiLFxuICAgICAgICBwZWckYzQyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiaXRcIiwgZGVzY3JpcHRpb246IFwiXFxcIml0XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNDMgPSBcIm9mXCIsXG4gICAgICAgIHBlZyRjNDQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJvZlwiLCBkZXNjcmlwdGlvbjogXCJcXFwib2ZcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM0NSA9IFwib25cIixcbiAgICAgICAgcGVnJGM0NiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm9uXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJvblxcXCJcIiB9LFxuICAgICAgICBwZWckYzQ3ID0gXCJ0b1wiLFxuICAgICAgICBwZWckYzQ4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidG9cIiwgZGVzY3JpcHRpb246IFwiXFxcInRvXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNDkgPSBcImFuZFwiLFxuICAgICAgICBwZWckYzUwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiYW5kXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJhbmRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM1MSA9IFwibGV0XCIsXG4gICAgICAgIHBlZyRjNTIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJsZXRcIiwgZGVzY3JpcHRpb246IFwiXFxcImxldFxcXCJcIiB9LFxuICAgICAgICBwZWckYzUzID0gXCJub3RcIixcbiAgICAgICAgcGVnJGM1NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm5vdFwiLCBkZXNjcmlwdGlvbjogXCJcXFwibm90XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNTUgPSBcInRoZVwiLFxuICAgICAgICBwZWckYzU2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidGhlXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ0aGVcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM1NyA9IFwiY2FsbFwiLFxuICAgICAgICBwZWckYzU4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiY2FsbFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiY2FsbFxcXCJcIiB9LFxuICAgICAgICBwZWckYzU5ID0gXCJkcmF3XCIsXG4gICAgICAgIHBlZyRjNjAgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJkcmF3XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJkcmF3XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNjEgPSBcImZyb21cIixcbiAgICAgICAgcGVnJGM2MiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImZyb21cIiwgZGVzY3JpcHRpb246IFwiXFxcImZyb21cXFwiXCIgfSxcbiAgICAgICAgcGVnJGM2MyA9IFwidGhhdFwiLFxuICAgICAgICBwZWckYzY0ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidGhhdFwiLCBkZXNjcmlwdGlvbjogXCJcXFwidGhhdFxcXCJcIiB9LFxuICAgICAgICBwZWckYzY1ID0gXCJ3aXRoIGNlbnRlclwiLFxuICAgICAgICBwZWckYzY2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwid2l0aCBjZW50ZXJcIiwgZGVzY3JpcHRpb246IFwiXFxcIndpdGggY2VudGVyXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNjcgPSBcImNlbnRlcmVkIGF0XCIsXG4gICAgICAgIHBlZyRjNjggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJjZW50ZXJlZCBhdFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiY2VudGVyZWQgYXRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM2OSA9IFwiY29udGFpbmluZ1wiLFxuICAgICAgICBwZWckYzcwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiY29udGFpbmluZ1wiLCBkZXNjcmlwdGlvbjogXCJcXFwiY29udGFpbmluZ1xcXCJcIiB9LFxuICAgICAgICBwZWckYzcxID0gXCJkZWZpbmVkXCIsXG4gICAgICAgIHBlZyRjNzIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJkZWZpbmVkXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJkZWZpbmVkXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNzMgPSBcImRldGVybWluZWRcIixcbiAgICAgICAgcGVnJGM3NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImRldGVybWluZWRcIiwgZGVzY3JpcHRpb246IFwiXFxcImRldGVybWluZWRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM3NSA9IFwiaW50ZXJzZWN0aW9uXCIsXG4gICAgICAgIHBlZyRjNzYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJpbnRlcnNlY3Rpb25cIiwgZGVzY3JpcHRpb246IFwiXFxcImludGVyc2VjdGlvblxcXCJcIiB9LFxuICAgICAgICBwZWckYzc3ID0gXCJzZWdtZW50XCIsXG4gICAgICAgIHBlZyRjNzggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJzZWdtZW50XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJzZWdtZW50XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNzkgPSBcImNpcmNsZVwiLFxuICAgICAgICBwZWckYzgwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiY2lyY2xlXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJjaXJjbGVcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM4MSA9IFwibGluZVwiLFxuICAgICAgICBwZWckYzgyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibGluZVwiLCBkZXNjcmlwdGlvbjogXCJcXFwibGluZVxcXCJcIiB9LFxuICAgICAgICBwZWckYzgzID0gXCJwb2ludFwiLFxuICAgICAgICBwZWckYzg0ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwicG9pbnRcIiwgZGVzY3JpcHRpb246IFwiXFxcInBvaW50XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjODUgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwibnVtYmVyXCIgfSxcbiAgICAgICAgcGVnJGM4NiA9IC9eWzAtOS5cXC1dLyxcbiAgICAgICAgcGVnJGM4NyA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbMC05LlxcXFwtXVwiLCBkZXNjcmlwdGlvbjogXCJbMC05LlxcXFwtXVwiIH0sXG4gICAgICAgIHBlZyRjODggPSBmdW5jdGlvbihkaWdpdHMpIHsgcmV0dXJuIHBhcnNlSW50KGRpZ2l0cy5qb2luKFwiXCIpLCAxMCk7IH0sXG4gICAgICAgIHBlZyRjODkgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwidmFybmFtZVwiIH0sXG4gICAgICAgIHBlZyRjOTAgPSAvXlthLXpBLVowLTldLyxcbiAgICAgICAgcGVnJGM5MSA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbYS16QS1aMC05XVwiLCBkZXNjcmlwdGlvbjogXCJbYS16QS1aMC05XVwiIH0sXG4gICAgICAgIHBlZyRjOTIgPSBmdW5jdGlvbihjaGFycykgeyByZXR1cm4gY2hhcnMuam9pbignJyk7IH0sXG5cbiAgICAgICAgcGVnJGN1cnJQb3MgICAgICAgICAgPSAwLFxuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgICAgICA9IDAsXG4gICAgICAgIHBlZyRjYWNoZWRQb3MgICAgICAgID0gMCxcbiAgICAgICAgcGVnJGNhY2hlZFBvc0RldGFpbHMgPSB7IGxpbmU6IDEsIGNvbHVtbjogMSwgc2VlbkNSOiBmYWxzZSB9LFxuICAgICAgICBwZWckbWF4RmFpbFBvcyAgICAgICA9IDAsXG4gICAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQgID0gW10sXG4gICAgICAgIHBlZyRzaWxlbnRGYWlscyAgICAgID0gMCxcblxuICAgICAgICBwZWckcmVzdWx0O1xuXG4gICAgaWYgKFwic3RhcnRSdWxlXCIgaW4gb3B0aW9ucykge1xuICAgICAgaWYgKCEob3B0aW9ucy5zdGFydFJ1bGUgaW4gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9ucykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgc3RhcnQgcGFyc2luZyBmcm9tIHJ1bGUgXFxcIlwiICsgb3B0aW9ucy5zdGFydFJ1bGUgKyBcIlxcXCIuXCIpO1xuICAgICAgfVxuXG4gICAgICBwZWckc3RhcnRSdWxlRnVuY3Rpb24gPSBwZWckc3RhcnRSdWxlRnVuY3Rpb25zW29wdGlvbnMuc3RhcnRSdWxlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0ZXh0KCkge1xuICAgICAgcmV0dXJuIGlucHV0LnN1YnN0cmluZyhwZWckcmVwb3J0ZWRQb3MsIHBlZyRjdXJyUG9zKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvZmZzZXQoKSB7XG4gICAgICByZXR1cm4gcGVnJHJlcG9ydGVkUG9zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpbmUoKSB7XG4gICAgICByZXR1cm4gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBlZyRyZXBvcnRlZFBvcykubGluZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2x1bW4oKSB7XG4gICAgICByZXR1cm4gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBlZyRyZXBvcnRlZFBvcykuY29sdW1uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cGVjdGVkKGRlc2NyaXB0aW9uKSB7XG4gICAgICB0aHJvdyBwZWckYnVpbGRFeGNlcHRpb24oXG4gICAgICAgIG51bGwsXG4gICAgICAgIFt7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uIH1dLFxuICAgICAgICBwZWckcmVwb3J0ZWRQb3NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xuICAgICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKG1lc3NhZ2UsIG51bGwsIHBlZyRyZXBvcnRlZFBvcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBvcykge1xuICAgICAgZnVuY3Rpb24gYWR2YW5jZShkZXRhaWxzLCBzdGFydFBvcywgZW5kUG9zKSB7XG4gICAgICAgIHZhciBwLCBjaDtcblxuICAgICAgICBmb3IgKHAgPSBzdGFydFBvczsgcCA8IGVuZFBvczsgcCsrKSB7XG4gICAgICAgICAgY2ggPSBpbnB1dC5jaGFyQXQocCk7XG4gICAgICAgICAgaWYgKGNoID09PSBcIlxcblwiKSB7XG4gICAgICAgICAgICBpZiAoIWRldGFpbHMuc2VlbkNSKSB7IGRldGFpbHMubGluZSsrOyB9XG4gICAgICAgICAgICBkZXRhaWxzLmNvbHVtbiA9IDE7XG4gICAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiXFxyXCIgfHwgY2ggPT09IFwiXFx1MjAyOFwiIHx8IGNoID09PSBcIlxcdTIwMjlcIikge1xuICAgICAgICAgICAgZGV0YWlscy5saW5lKys7XG4gICAgICAgICAgICBkZXRhaWxzLmNvbHVtbiA9IDE7XG4gICAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRldGFpbHMuY29sdW1uKys7XG4gICAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocGVnJGNhY2hlZFBvcyAhPT0gcG9zKSB7XG4gICAgICAgIGlmIChwZWckY2FjaGVkUG9zID4gcG9zKSB7XG4gICAgICAgICAgcGVnJGNhY2hlZFBvcyA9IDA7XG4gICAgICAgICAgcGVnJGNhY2hlZFBvc0RldGFpbHMgPSB7IGxpbmU6IDEsIGNvbHVtbjogMSwgc2VlbkNSOiBmYWxzZSB9O1xuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UocGVnJGNhY2hlZFBvc0RldGFpbHMsIHBlZyRjYWNoZWRQb3MsIHBvcyk7XG4gICAgICAgIHBlZyRjYWNoZWRQb3MgPSBwb3M7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwZWckY2FjaGVkUG9zRGV0YWlscztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckZmFpbChleHBlY3RlZCkge1xuICAgICAgaWYgKHBlZyRjdXJyUG9zIDwgcGVnJG1heEZhaWxQb3MpIHsgcmV0dXJuOyB9XG5cbiAgICAgIGlmIChwZWckY3VyclBvcyA+IHBlZyRtYXhGYWlsUG9zKSB7XG4gICAgICAgIHBlZyRtYXhGYWlsUG9zID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQgPSBbXTtcbiAgICAgIH1cblxuICAgICAgcGVnJG1heEZhaWxFeHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckYnVpbGRFeGNlcHRpb24obWVzc2FnZSwgZXhwZWN0ZWQsIHBvcykge1xuICAgICAgZnVuY3Rpb24gY2xlYW51cEV4cGVjdGVkKGV4cGVjdGVkKSB7XG4gICAgICAgIHZhciBpID0gMTtcblxuICAgICAgICBleHBlY3RlZC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICBpZiAoYS5kZXNjcmlwdGlvbiA8IGIuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGEuZGVzY3JpcHRpb24gPiBiLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB3aGlsZSAoaSA8IGV4cGVjdGVkLmxlbmd0aCkge1xuICAgICAgICAgIGlmIChleHBlY3RlZFtpIC0gMV0gPT09IGV4cGVjdGVkW2ldKSB7XG4gICAgICAgICAgICBleHBlY3RlZC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYnVpbGRNZXNzYWdlKGV4cGVjdGVkLCBmb3VuZCkge1xuICAgICAgICBmdW5jdGlvbiBzdHJpbmdFc2NhcGUocykge1xuICAgICAgICAgIGZ1bmN0aW9uIGhleChjaCkgeyByZXR1cm4gY2guY2hhckNvZGVBdCgwKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTsgfVxuXG4gICAgICAgICAgcmV0dXJuIHNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csICAgJ1xcXFxcXFxcJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAgICAnXFxcXFwiJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHgwOC9nLCAnXFxcXGInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAgICdcXFxcdCcpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxuL2csICAgJ1xcXFxuJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXGYvZywgICAnXFxcXGYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAgICdcXFxccicpXG4gICAgICAgICAgICAucmVwbGFjZSgvW1xceDAwLVxceDA3XFx4MEJcXHgwRVxceDBGXS9nLCBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx4MCcgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHgxMC1cXHgxRlxceDgwLVxceEZGXS9nLCAgICBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx4JyAgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHUwMTgwLVxcdTBGRkZdL2csICAgICAgICAgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxcdTAnICsgaGV4KGNoKTsgfSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx1MTA4MC1cXHVGRkZGXS9nLCAgICAgICAgIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHUnICArIGhleChjaCk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV4cGVjdGVkRGVzY3MgPSBuZXcgQXJyYXkoZXhwZWN0ZWQubGVuZ3RoKSxcbiAgICAgICAgICAgIGV4cGVjdGVkRGVzYywgZm91bmREZXNjLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGV4cGVjdGVkRGVzY3NbaV0gPSBleHBlY3RlZFtpXS5kZXNjcmlwdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdGVkRGVzYyA9IGV4cGVjdGVkLmxlbmd0aCA+IDFcbiAgICAgICAgICA/IGV4cGVjdGVkRGVzY3Muc2xpY2UoMCwgLTEpLmpvaW4oXCIsIFwiKVxuICAgICAgICAgICAgICArIFwiIG9yIFwiXG4gICAgICAgICAgICAgICsgZXhwZWN0ZWREZXNjc1tleHBlY3RlZC5sZW5ndGggLSAxXVxuICAgICAgICAgIDogZXhwZWN0ZWREZXNjc1swXTtcblxuICAgICAgICBmb3VuZERlc2MgPSBmb3VuZCA/IFwiXFxcIlwiICsgc3RyaW5nRXNjYXBlKGZvdW5kKSArIFwiXFxcIlwiIDogXCJlbmQgb2YgaW5wdXRcIjtcblxuICAgICAgICByZXR1cm4gXCJFeHBlY3RlZCBcIiArIGV4cGVjdGVkRGVzYyArIFwiIGJ1dCBcIiArIGZvdW5kRGVzYyArIFwiIGZvdW5kLlwiO1xuICAgICAgfVxuXG4gICAgICB2YXIgcG9zRGV0YWlscyA9IHBlZyRjb21wdXRlUG9zRGV0YWlscyhwb3MpLFxuICAgICAgICAgIGZvdW5kICAgICAgPSBwb3MgPCBpbnB1dC5sZW5ndGggPyBpbnB1dC5jaGFyQXQocG9zKSA6IG51bGw7XG5cbiAgICAgIGlmIChleHBlY3RlZCAhPT0gbnVsbCkge1xuICAgICAgICBjbGVhbnVwRXhwZWN0ZWQoZXhwZWN0ZWQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFN5bnRheEVycm9yKFxuICAgICAgICBtZXNzYWdlICE9PSBudWxsID8gbWVzc2FnZSA6IGJ1aWxkTWVzc2FnZShleHBlY3RlZCwgZm91bmQpLFxuICAgICAgICBleHBlY3RlZCxcbiAgICAgICAgZm91bmQsXG4gICAgICAgIHBvcyxcbiAgICAgICAgcG9zRGV0YWlscy5saW5lLFxuICAgICAgICBwb3NEZXRhaWxzLmNvbHVtblxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzdGFydCgpIHtcbiAgICAgIHZhciBzMCwgczE7XG5cbiAgICAgIHMwID0gW107XG4gICAgICBzMSA9IHBlZyRwYXJzZWRlY2woKTtcbiAgICAgIHdoaWxlIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMC5wdXNoKHMxKTtcbiAgICAgICAgczEgPSBwZWckcGFyc2VkZWNsKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VkZWNsKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlbGV0KCk7XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckYzI7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlYmUoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlb2JqZWN0KCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBbXTtcbiAgICAgICAgICAgICAgaWYgKHBlZyRjMy50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgczYgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHdoaWxlIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM1LnB1c2goczYpO1xuICAgICAgICAgICAgICAgIGlmIChwZWckYzMudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgczYgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGM1KHMyLCBzNCk7XG4gICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IHBlZyRwYXJzZWRyYXcoKTtcbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIgPSBwZWckcGFyc2VvYmplY3QoKTtcbiAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZWFuZCgpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlY2FsbCgpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZWl0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZXZhcm5hbWUoKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzYoczcpO1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHM0O1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgICAgczMgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgczMgPSBwZWckYzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczMgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczMgPSBwZWckYzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczQgPSBbXTtcbiAgICAgICAgICAgICAgaWYgKHBlZyRjMy50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHdoaWxlIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgICAgIGlmIChwZWckYzMudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGM3KHMyLCBzMyk7XG4gICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VvYmplY3QoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlcG9pbnQoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZW9iamVjdDJkKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vwb2ludCgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgczAgPSBwZWckcGFyc2Vwb2ludF9saXRlcmFsKCk7XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckcGFyc2VpbnRlcnNlY3Rpb24oKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXBvaW50X2xpdGVyYWwoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3LCBzOCwgczksIHMxMCwgczExLCBzMTIsIHMxMztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMiA9IHBlZyRwYXJzZXRoZSgpO1xuICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlYSgpO1xuICAgICAgfVxuICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgfVxuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMzID0gcGVnJHBhcnNldF9wb2ludCgpO1xuICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMiA9IFtzMiwgczNdO1xuICAgICAgICAgIHMxID0gczI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgICBzMSA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgczEgPSBwZWckYzE7XG4gICAgICB9XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckYzI7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBbXTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczMgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyLnB1c2goczMpO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczMgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDApIHtcbiAgICAgICAgICAgIHMzID0gcGVnJGMxMDtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IFtdO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczQucHVzaChzNSk7XG4gICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlbnVtYmVyKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gW107XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICBzNyA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzNyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2hpbGUgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNi5wdXNoKHM3KTtcbiAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDQpIHtcbiAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckYzEyO1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTMpOyB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczggPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczkgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChzOSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgIHM4LnB1c2goczkpO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzOCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgIHM5ID0gcGVnJHBhcnNlbnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHM5ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgczExID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoczExICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMxMC5wdXNoKHMxMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEwICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckYzE0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczExID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTUpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEzID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHMxMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyLnB1c2goczEzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTMgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzE2KHM1LCBzOSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb2JqZWN0MmQoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlY2lyY2xlKCk7XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckcGFyc2VsaW5lKCk7XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMwID0gcGVnJHBhcnNlc2VnbWVudCgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjaXJjbGUoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczY7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZXRoZSgpO1xuICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJHBhcnNlYSgpO1xuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNldF9jaXJjbGUoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VjZW50ZXJlZCgpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2Vjb250YWluaW5nKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNldmFybmFtZSgpO1xuICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMTcoczQsIHM2KTtcbiAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VsaW5lKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNldGhlKCk7XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckcGFyc2VhKCk7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2V0X2xpbmUoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBzNCA9IHBlZyRwYXJzZWZyb20oKTtcbiAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNldmFybmFtZSgpO1xuICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNldG8oKTtcbiAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMxOChzNSwgczcpO1xuICAgICAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlY29udGFpbmluZygpO1xuICAgICAgICAgICAgaWYgKHMzID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlZGV0ZXJtaW5lZCgpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZWJ5KCk7XG4gICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNSA9IFtzNSwgczZdO1xuICAgICAgICAgICAgICAgICAgczQgPSBzNTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNDtcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNldmFybmFtZSgpO1xuICAgICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VhbmQoKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZXZhcm5hbWUoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczM7XG4gICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzE4KHM1LCBzNyk7XG4gICAgICAgICAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMTkoczMpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXNlZ21lbnQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3LCBzODtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNldGhlKCk7XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckcGFyc2VhKCk7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2V0X3NlZ21lbnQoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBzNCA9IHBlZyRwYXJzZWZyb20oKTtcbiAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNldmFybmFtZSgpO1xuICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNldG8oKTtcbiAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMyMChzNSwgczcpO1xuICAgICAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlY29udGFpbmluZygpO1xuICAgICAgICAgICAgaWYgKHMzID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlZGV0ZXJtaW5lZCgpO1xuICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZWJ5KCk7XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNCA9IFtzNCwgczVdO1xuICAgICAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzMyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICBzNSA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgczYgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdoaWxlIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczUucHVzaChzNik7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgczYgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxNCkgPT09IHBlZyRjMjEpIHtcbiAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckYzIxO1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAxNDtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzIyKTsgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM3ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgIHM4ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoczggIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNy5wdXNoKHM4KTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNSA9IFtzNSwgczYsIHM3XTtcbiAgICAgICAgICAgICAgICAgICAgICBzNCA9IHM1O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMyMChzNSwgczcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzIzKHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VpbnRlcnNlY3Rpb24oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VhKCk7XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckcGFyc2V0aGUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZXRfaW50ZXJzZWN0aW9uKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlb2YoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNldmFybmFtZSgpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlYW5kKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNldmFybmFtZSgpO1xuICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2Vjb25kaXRpb24oKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzNyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzI0KHM0LCBzNiwgczcpO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vjb25kaXRpb24oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNldGhhdCgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlaXMoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBzNCA9IHBlZyRwYXJzZW5vdCgpO1xuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2V2YXJuYW1lKCk7XG4gICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczQgPSBbczQsIHM1XTtcbiAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgczMgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlb24oKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZXZhcm5hbWUoKTtcbiAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczQgPSBbczQsIHM1XTtcbiAgICAgICAgICAgICAgICBzMyA9IHM0O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgICAgczMgPSBwZWckYzE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzI1KHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VhKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMyNikge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMjcpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMyOCkge1xuICAgICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzI5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlYmUoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDYxKSB7XG4gICAgICAgICAgczIgPSBwZWckYzMxO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzMik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzMzKSB7XG4gICAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMik7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzQpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMiA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMzNSkge1xuICAgICAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzNik7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWJ5KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMzNykge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzgpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWlzKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMzOSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDApOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMzID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzMwKHMyKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VpdCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICB9XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDEpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMik7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQyKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb2YoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQzKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0NCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb24oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQ1KSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0Nik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldG8oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQ3KSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0OCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlYW5kKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM0OSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTApOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWxldCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICB9XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNTEpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzUyKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzMwKHMyKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vub3QoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzUzKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM1NCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldGhlKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM1NSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTYpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWNhbGwoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzU3KSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM1OCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlZHJhdygpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICB9XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNTkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzYwKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzMwKHMyKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vmcm9tKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM2MSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjIpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXRoYXQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzYzKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2NCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMChzMik7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlY2VudGVyZWQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM2NSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMSk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2Nik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM2Nykge1xuICAgICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDExKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDExO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjgpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzMwKHMyKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vjb250YWluaW5nKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNjkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDEwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNzApOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWRldGVybWluZWQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMjtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM3MSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA3KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA3O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNzIpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNzMpIHtcbiAgICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMCk7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSAxMDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzc0KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICBzMSA9IHBlZyRjMzAoczIpO1xuICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2V0X2ludGVyc2VjdGlvbigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICB9XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEyKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzc1KSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEyKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAxMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzc2KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxID0gW3MxLCBzMiwgczNdO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXRfc2VnbWVudCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICB9XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNzcpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzc4KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxID0gW3MxLCBzMiwgczNdO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXRfY2lyY2xlKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM3OSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjODApOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBbczEsIHMyLCBzM107XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldF9saW5lKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM4MSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjODIpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBbczEsIHMyLCBzM107XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldF9wb2ludCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICB9XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjODMpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzg0KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgIGlmIChwZWckYzgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxID0gW3MxLCBzMiwgczNdO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW51bWJlcigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjODYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM4Nyk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICBpZiAocGVnJGM4Ni50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjODcpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRjMTtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgczEgPSBwZWckYzg4KHMxKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG4gICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM4NSk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXZhcm5hbWUoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMiA9IHBlZyRwYXJzZXRoZSgpO1xuICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgfVxuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMzID0gcGVnJHBhcnNldF9zZWdtZW50KCk7XG4gICAgICAgIGlmIChzMyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNldF9jaXJjbGUoKTtcbiAgICAgICAgICBpZiAoczMgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNldF9saW5lKCk7XG4gICAgICAgICAgICBpZiAoczMgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczMgPSBwZWckcGFyc2V0X3BvaW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gW3MyLCBzM107XG4gICAgICAgICAgczEgPSBzMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgIHMxID0gcGVnJGMxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICBzMSA9IHBlZyRjMTtcbiAgICAgIH1cbiAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRjMjtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IFtdO1xuICAgICAgICBpZiAocGVnJGM5MC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczMgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5MSk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICB3aGlsZSAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyLnB1c2goczMpO1xuICAgICAgICAgICAgaWYgKHBlZyRjOTAudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzMyA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5MSk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzkyKHMyKTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMxO1xuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjODkpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cblxuICAgICAgZnVuY3Rpb24gd2l0aE5hbWUob2JqLCBuYW1lKSB7XG4gICAgICAgIG9iai5uYW1lID0gbmFtZTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuXG4gICAgcGVnJHJlc3VsdCA9IHBlZyRzdGFydFJ1bGVGdW5jdGlvbigpO1xuXG4gICAgaWYgKHBlZyRyZXN1bHQgIT09IHBlZyRGQUlMRUQgJiYgcGVnJGN1cnJQb3MgPT09IGlucHV0Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHBlZyRyZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChwZWckcmVzdWx0ICE9PSBwZWckRkFJTEVEICYmIHBlZyRjdXJyUG9zIDwgaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIHBlZyRmYWlsKHsgdHlwZTogXCJlbmRcIiwgZGVzY3JpcHRpb246IFwiZW5kIG9mIGlucHV0XCIgfSk7XG4gICAgICB9XG5cbiAgICAgIHRocm93IHBlZyRidWlsZEV4Y2VwdGlvbihudWxsLCBwZWckbWF4RmFpbEV4cGVjdGVkLCBwZWckbWF4RmFpbFBvcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBTeW50YXhFcnJvcjogU3ludGF4RXJyb3IsXG4gICAgcGFyc2U6ICAgICAgIHBhcnNlXG4gIH07XG59KSgpO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcblxuZnVuY3Rpb24gdW5pcXVlX3ByZWQobGlzdCwgY29tcGFyZSkge1xuICB2YXIgcHRyID0gMVxuICAgICwgbGVuID0gbGlzdC5sZW5ndGhcbiAgICAsIGE9bGlzdFswXSwgYj1saXN0WzBdXG4gIGZvcih2YXIgaT0xOyBpPGxlbjsgKytpKSB7XG4gICAgYiA9IGFcbiAgICBhID0gbGlzdFtpXVxuICAgIGlmKGNvbXBhcmUoYSwgYikpIHtcbiAgICAgIGlmKGkgPT09IHB0cikge1xuICAgICAgICBwdHIrK1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgbGlzdFtwdHIrK10gPSBhXG4gICAgfVxuICB9XG4gIGxpc3QubGVuZ3RoID0gcHRyXG4gIHJldHVybiBsaXN0XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZV9lcShsaXN0KSB7XG4gIHZhciBwdHIgPSAxXG4gICAgLCBsZW4gPSBsaXN0Lmxlbmd0aFxuICAgICwgYT1saXN0WzBdLCBiID0gbGlzdFswXVxuICBmb3IodmFyIGk9MTsgaTxsZW47ICsraSwgYj1hKSB7XG4gICAgYiA9IGFcbiAgICBhID0gbGlzdFtpXVxuICAgIGlmKGEgIT09IGIpIHtcbiAgICAgIGlmKGkgPT09IHB0cikge1xuICAgICAgICBwdHIrK1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgbGlzdFtwdHIrK10gPSBhXG4gICAgfVxuICB9XG4gIGxpc3QubGVuZ3RoID0gcHRyXG4gIHJldHVybiBsaXN0XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZShsaXN0LCBjb21wYXJlLCBzb3J0ZWQpIHtcbiAgaWYobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbGlzdFxuICB9XG4gIGlmKGNvbXBhcmUpIHtcbiAgICBpZighc29ydGVkKSB7XG4gICAgICBsaXN0LnNvcnQoY29tcGFyZSlcbiAgICB9XG4gICAgcmV0dXJuIHVuaXF1ZV9wcmVkKGxpc3QsIGNvbXBhcmUpXG4gIH1cbiAgaWYoIXNvcnRlZCkge1xuICAgIGxpc3Quc29ydCgpXG4gIH1cbiAgcmV0dXJuIHVuaXF1ZV9lcShsaXN0KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVuaXF1ZVxuIl19
