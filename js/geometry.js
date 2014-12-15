!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.geom=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports = {
  model: require("./lib/model"),
  intersection: require("./lib/intersection"),
  Scene: require("./lib/scene"),
  renderer: require("./lib/render"),
  behavior: require("./lib/behavior"),
  parse: require("./lib/parse")
};

},{"./lib/behavior":2,"./lib/intersection":4,"./lib/model":7,"./lib/parse":12,"./lib/render":13,"./lib/scene":14}],2:[function(require,module,exports){
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
function between(x, a, b) {
  var left = Math.min(a, b), right = Math.max(a, b);
  return (left <= x && x <= right);
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
    return intersectCircleCircle(o1, o2);
    // if only one is a circle, it should be first.
  else if (o2 instanceof Circle) return intersect(o2, o1);else if (o1 instanceof Circle && o2 instanceof Segment) // circle-segment
    return intersectCircleLine(o1, o2, true);else if (o1 instanceof Circle && o2 instanceof Line) // circle-line
    return intersectCircleLine(o1, o2, false);else if (o1 instanceof Segment && o2 instanceof Segment) // segment-segment
    return intersectLineLine(o1, o2, true);
    // if only one is a segment, it should be first.
  else if (o2 instanceof Segment) return intersect(o2, o1);else if (o1 instanceof Line && o2 instanceof Line) // line-line
    return intersectLineLine(o1, o2, false);

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

  if (!clip || (between(s, 0, 1) && between(t, 0, 1))) return [P(0, x1 + t * s1.dx, y1 + t * s1.dy)];else return []; // no collision
}

/* http://mathworld.wolfram.com/Circle-LineIntersection.html */
function intersectCircleLine(c, s, clip) {
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
  return uniq([P(0, cx + nx + x0, cy + ny + y0), P(1, cx - nx + x0, cy - ny + y0)], comparePoints).filter(function (p) {
    return (clip ? between(p.x, x1, x2) && between(p.y, y1, y2) : true);
  });
}


module.exports = {
  intersect: intersect,
  intersectCircleCircle: intersectCircleCircle,
  intersectCircleLine: intersectCircleLine,
  intersectLineLine: intersectLineLine };

},{"./calc":3,"./model":7,"uniq":16}],5:[function(require,module,exports){
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
    if (typeof a === "undefined") {
      a = center;
      center = name;
      name = null;
    }

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

},{"../calc":3,"./geom":6,"./point":10,"./segment":11}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
"use strict";

var Point = require("./point"), Circle = require("./circle"), Line = require("./line"), Segment = require("./segment");

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
      if (o1.x === null || o2.x === null || o1.y === null || o2.y === null) return false;else return equal(Math.abs(o1.x - o2.x) + Math.abs(o1.y - o2.y), 0);
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

},{"./circle":5,"./line":9,"./point":10,"./segment":11}],8:[function(require,module,exports){
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

var Geom = require("./geom");

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

    if (name instanceof Geom) {
      objects.shift(name);
      name = null;
    }
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

},{"../intersection":4,"./geom":6,"./point":10}],9:[function(require,module,exports){
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
    if (typeof p2 === "undefined") {
      p2 = p1;
      p1 = name;
      name = null;
    }

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

},{"./geom":6}],10:[function(require,module,exports){
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
    if (typeof y === "undefined") {
      y = x;
      x = name;
      name = null;
    }
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
    return new Point(name, x, y);
  };

  return Point;
})(Geom);

},{"./geom":6}],11:[function(require,module,exports){
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
"use strict";

var parser = require("euclid-parser");

module.exports = function (scene, text, cb) {
  function error(item, message) {
    var err = new Error(message);
    if (item.source) {
      err.line = item.source.line;
      err.column = item.source.column;
      err.text = item.source.text;
    }
    throw err;
  }

  function resolve(stack, item) {
    if (item.name) {
      if (scene.get(item.name)) {
        return item.name;
      } else {
        error(item, "Could not find " + item.name);
      }
    } else {
      if (stack.indexOf(item) >= 0) {
        error(item, "Circular reference!");
      }
      stack.push(item);
      return parse(stack, item);
      stack.pop();
    }
  }

  function parse(stack, item) {
    switch (item.type) {
      case "group":
        scene.group(item.name);
        return item.name;
        break;
      case "point":
        scene.point(item.name, item.x, item.y);
        break;
      case "line":
        scene.line(item.name, resolve(stack, item.points[0]), resolve(stack, item.points[1]));
        break;
      case "segment":
        scene.segment(item.name, resolve(stack, item.points[0]), resolve(stack, item.points[1]));
        break;
      case "circle":
        scene.circle(item.name, resolve(stack, item.center), resolve(stack, item.boundaryPoint));
        break;
      case "intersection":
        var which = 0;
        if (item.which && item.which.op === "not") which = scene.isnt(item.which.args[0]);

        scene.intersection(item.name, resolve(stack, item.objects[0]), resolve(stack, item.objects[1]), which);
        break;
    }

    return scene.last().name;
  }

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
      scene._objects.keys().filter(function (name) {
        return parsedNames.indexOf(name) < 0;
      }).forEach(function (name) {
        return scene._objects.remove(name);
      });

      /* now handle the actual parsed objects */
      for (var i = 0; i < parsedObjects.length; i++) {
        parse([], parsedObjects[i]);
      }

      if (cb) cb(true);
    })();
  } catch (e) {
    console.error(e.stack);
    if (cb) cb(null, e);
  }
};

},{"euclid-parser":15}],13:[function(require,module,exports){
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
},{"./model":7}],14:[function(require,module,exports){
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

  Scene.prototype.last = function () {
    return this._last;
  };

  Scene.prototype.get = function (name) {
    return this._objects.get(name);
  };

  Scene.prototype.point = function (name, x, y) {
    return this.add(new Point(name, x, y));
  };

  Scene.prototype.circle = function (name, centerId, boundaryId) {
    return this.add(new Circle(name, this.get(centerId), this.get(boundaryId)));
  };

  Scene.prototype.segment = function (name, id1, id2) {
    return this.add(new Segment(name, this.get(id1), this.get(id2)));
  };

  Scene.prototype.line = function (name, id1, id2) {
    return this.add(new Line(name, this.get(id1), this.get(id2)));
  };

  Scene.prototype.intersection = function (name, id1, id2, which) {
    var o1 = this.get(id1), o2 = this.get(id2);
    if (!o1) throw new Error("Can't find object " + id1);
    if (!o2) throw new Error("Can't find object " + id2);

    return this.add(new Intersection(name, o1, o2, which));
  };

  Scene.prototype.group = function (tag) {
    this._currentTag = tag;
    return this;
  };

  Scene.prototype.add = function (object) {
    // if we already have this object, and it's the same type, then update the
    // existing one in place.
    var existing = this._objects.get(object.name);
    if (existing && (existing.constructor.name === object.constructor.name)) {
      for (var prop in object) {
        existing[prop] = object[prop];
      }object = existing;
    }
    // if an object of the same name but different type or an object that is
    // geometrically equivalent already exists in the scene, do nothing.
    else if (existing || (existing = this.find(object))) {
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

  Scene.prototype.freeName = function () {
    var keys = this._objects.keys(), id = 0;
    for (; keys.indexOf("object" + id) >= 0; id++);
    return "object" + id;
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
      }) };
    this.log.push(state);
  };

  return Scene;
})();

module.exports = Scene;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./model":7,"./model/intersection":8}],15:[function(require,module,exports){
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

        peg$c0 = peg$FAILED,
        peg$c1 = [],
        peg$c2 = /^[\n ]/,
        peg$c3 = { type: "class", value: "[\\n ]", description: "[\\n ]" },
        peg$c4 = function(r) { return r; },
        peg$c5 = function(d) {return d;},
        peg$c6 = function(head, tail) { return [head].concat(tail) },
        peg$c7 = null,
        peg$c8 = "let",
        peg$c9 = { type: "literal", value: "let", description: "\"let\"" },
        peg$c10 = "be",
        peg$c11 = { type: "literal", value: "be", description: "\"be\"" },
        peg$c12 = "equal",
        peg$c13 = { type: "literal", value: "equal", description: "\"equal\"" },
        peg$c14 = "=",
        peg$c15 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c16 = /^[ ]/,
        peg$c17 = { type: "class", value: "[ ]", description: "[ ]" },
        peg$c18 = ".",
        peg$c19 = { type: "literal", value: ".", description: "\".\"" },
        peg$c20 = function(name, obj) { return named(obj, name) },
        peg$c21 = "draw",
        peg$c22 = { type: "literal", value: "draw", description: "\"draw\"" },
        peg$c23 = function(name) {return name;},
        peg$c24 = function(obj, name) { return named(obj, name) },
        peg$c25 = "#",
        peg$c26 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c27 = /^[^\n]/,
        peg$c28 = { type: "class", value: "[^\\n]", description: "[^\\n]" },
        peg$c29 = function(val) { return {type: 'comment', value: val} },
        peg$c30 = { type: "other", description: "the name of a point" },
        peg$c31 = "point",
        peg$c32 = { type: "literal", value: "point", description: "\"point\"" },
        peg$c33 = function(name) { return {type: 'point', name:name} },
        peg$c34 = { type: "other", description: "(x,y)" },
        peg$c35 = "(",
        peg$c36 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c37 = ",",
        peg$c38 = { type: "literal", value: ",", description: "\",\"" },
        peg$c39 = ")",
        peg$c40 = { type: "literal", value: ")", description: "\")\"" },
        peg$c41 = function(x, y) { return o({type: 'point',x: x,y: y}) },
        peg$c42 = { type: "other", description: "name of a circle" },
        peg$c43 = "circle",
        peg$c44 = { type: "literal", value: "circle", description: "\"circle\"" },
        peg$c45 = function(name) { return {type: 'circle', name: name} },
        peg$c46 = { type: "other", description: "circle definition" },
        peg$c47 = "and",
        peg$c48 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c49 = function(c1, c2) {
          if(c1.type === c2.type) { expected('a center and a point contained by the circle') }
          var ret = o({type: 'circle'});
          ret[c1.type] = c1.point;
          ret[c2.type] = c2.point;
          return ret;
        },
        peg$c50 = function(center) { return {type: 'center', point: center} },
        peg$c51 = function(point) { return {type: 'boundaryPoint', point: point } },
        peg$c52 = { type: "other", description: "the name of a line or segment" },
        peg$c53 = "-",
        peg$c54 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c55 = function(type, p1, p2) { return {type: 'line', points: [p1, p2]} },
        peg$c56 = function(type, name) { return {type: type, name: name} },
        peg$c57 = { type: "other", description: "line definition" },
        peg$c58 = function(type, points) { return o({type: type, points: points}) },
        peg$c59 = "line segment",
        peg$c60 = { type: "literal", value: "line segment", description: "\"line segment\"" },
        peg$c61 = "segment",
        peg$c62 = { type: "literal", value: "segment", description: "\"segment\"" },
        peg$c63 = "line",
        peg$c64 = { type: "literal", value: "line", description: "\"line\"" },
        peg$c65 = function(line) {return (line === 'line') ? 'line' : 'segment' },
        peg$c66 = "from",
        peg$c67 = { type: "literal", value: "from", description: "\"from\"" },
        peg$c68 = "to",
        peg$c69 = { type: "literal", value: "to", description: "\"to\"" },
        peg$c70 = function(p1, p2) { return [p1,p2]; },
        peg$c71 = "determined by",
        peg$c72 = { type: "literal", value: "determined by", description: "\"determined by\"" },
        peg$c73 = "between",
        peg$c74 = { type: "literal", value: "between", description: "\"between\"" },
        peg$c75 = "joining",
        peg$c76 = { type: "literal", value: "joining", description: "\"joining\"" },
        peg$c77 = "with endpoints",
        peg$c78 = { type: "literal", value: "with endpoints", description: "\"with endpoints\"" },
        peg$c79 = function(p1, p2) { return [p1, p2]; },
        peg$c80 = "intersection of",
        peg$c81 = { type: "literal", value: "intersection of", description: "\"intersection of\"" },
        peg$c82 = function(c) { return c;},
        peg$c83 = function(objects, which) {return o({type: 'intersection', objects:objects, which: which});},
        peg$c84 = function(o1, o2) { return [o1, o2] },
        peg$c85 = function(o1, o2) { return [{type:'unknown',name:o1},{type:'unknown',name:o2}]; },
        peg$c86 = "that",
        peg$c87 = { type: "literal", value: "that", description: "\"that\"" },
        peg$c88 = function(name) { return {op:'not', args:[name]} },
        peg$c89 = "that is on",
        peg$c90 = { type: "literal", value: "that is on", description: "\"that is on\"" },
        peg$c91 = function(obj) { return {op: 'on', args:[obj]} },
        peg$c92 = "and call it",
        peg$c93 = { type: "literal", value: "and call it", description: "\"and call it\"" },
        peg$c94 = "called",
        peg$c95 = { type: "literal", value: "called", description: "\"called\"" },
        peg$c96 = "named",
        peg$c97 = { type: "literal", value: "named", description: "\"named\"" },
        peg$c98 = function(name) { return name; },
        peg$c99 = "with center",
        peg$c100 = { type: "literal", value: "with center", description: "\"with center\"" },
        peg$c101 = "centered at",
        peg$c102 = { type: "literal", value: "centered at", description: "\"centered at\"" },
        peg$c103 = "a",
        peg$c104 = { type: "literal", value: "a", description: "\"a\"" },
        peg$c105 = "an",
        peg$c106 = { type: "literal", value: "an", description: "\"an\"" },
        peg$c107 = "the",
        peg$c108 = { type: "literal", value: "the", description: "\"the\"" },
        peg$c109 = "through",
        peg$c110 = { type: "literal", value: "through", description: "\"through\"" },
        peg$c111 = "containing",
        peg$c112 = { type: "literal", value: "containing", description: "\"containing\"" },
        peg$c113 = "isn't",
        peg$c114 = { type: "literal", value: "isn't", description: "\"isn't\"" },
        peg$c115 = "isnt",
        peg$c116 = { type: "literal", value: "isnt", description: "\"isnt\"" },
        peg$c117 = "is not",
        peg$c118 = { type: "literal", value: "is not", description: "\"is not\"" },
        peg$c119 = { type: "other", description: "whitespace character" },
        peg$c120 = " ",
        peg$c121 = { type: "literal", value: " ", description: "\" \"" },
        peg$c122 = { type: "other", description: "whitespace" },
        peg$c123 = { type: "other", description: "number" },
        peg$c124 = /^[0-9.\-]/,
        peg$c125 = { type: "class", value: "[0-9.\\-]", description: "[0-9.\\-]" },
        peg$c126 = function(digits) { return parseInt(digits.join(""), 10); },
        peg$c127 = { type: "other", description: "variable name" },
        peg$c128 = /^[a-zA-Z0-9]/,
        peg$c129 = { type: "class", value: "[a-zA-Z0-9]", description: "[a-zA-Z0-9]" },
        peg$c130 = function(chars) { return chars.join(''); },

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
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parsedeclaration_list();
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c2.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c3); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c2.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c3); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c4(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsedeclaration_list() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsedeclaration();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = [];
        if (peg$c2.test(input.charAt(peg$currPos))) {
          s5 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c3); }
        }
        if (s5 !== peg$FAILED) {
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            if (peg$c2.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c3); }
            }
          }
        } else {
          s4 = peg$c0;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsedeclaration();
          if (s5 !== peg$FAILED) {
            peg$reportedPos = s3;
            s4 = peg$c5(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = [];
          if (peg$c2.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c3); }
          }
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c2.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c3); }
              }
            }
          } else {
            s4 = peg$c0;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsedeclaration();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s3;
              s4 = peg$c5(s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c6(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsedeclaration() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$parsecomment();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.substr(peg$currPos, 3).toLowerCase() === peg$c8) {
          s2 = input.substr(peg$currPos, 3);
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c7;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsevariable();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2).toLowerCase() === peg$c10) {
                s4 = input.substr(peg$currPos, 2);
                peg$currPos += 2;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s4 === peg$FAILED) {
                if (input.substr(peg$currPos, 5).toLowerCase() === peg$c12) {
                  s4 = input.substr(peg$currPos, 5);
                  peg$currPos += 5;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c13); }
                }
                if (s4 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 61) {
                    s4 = peg$c14;
                    peg$currPos++;
                  } else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c15); }
                  }
                }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseobject_literal();
                  if (s6 !== peg$FAILED) {
                    s7 = [];
                    if (peg$c16.test(input.charAt(peg$currPos))) {
                      s8 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c17); }
                    }
                    while (s8 !== peg$FAILED) {
                      s7.push(s8);
                      if (peg$c16.test(input.charAt(peg$currPos))) {
                        s8 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s8 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c17); }
                      }
                    }
                    if (s7 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 46) {
                        s8 = peg$c18;
                        peg$currPos++;
                      } else {
                        s8 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c19); }
                      }
                      if (s8 === peg$FAILED) {
                        s8 = peg$c7;
                      }
                      if (s8 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c20(s2, s6);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 4).toLowerCase() === peg$c21) {
            s1 = input.substr(peg$currPos, 4);
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c22); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parseobject_literal();
              if (s3 !== peg$FAILED) {
                s4 = peg$currPos;
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsecalled();
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s4;
                    s5 = peg$c23(s6);
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c0;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
                if (s4 === peg$FAILED) {
                  s4 = peg$c7;
                }
                if (s4 !== peg$FAILED) {
                  s5 = [];
                  if (peg$c16.test(input.charAt(peg$currPos))) {
                    s6 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c17); }
                  }
                  while (s6 !== peg$FAILED) {
                    s5.push(s6);
                    if (peg$c16.test(input.charAt(peg$currPos))) {
                      s6 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s6 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c17); }
                    }
                  }
                  if (s5 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 46) {
                      s6 = peg$c18;
                      peg$currPos++;
                    } else {
                      s6 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c19); }
                    }
                    if (s6 === peg$FAILED) {
                      s6 = peg$c7;
                    }
                    if (s6 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c24(s3, s4);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }

      return s0;
    }

    function peg$parsecomment() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 35) {
        s1 = peg$c25;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parses();
        if (s2 === peg$FAILED) {
          s2 = peg$c7;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = [];
          if (peg$c27.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c28); }
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            if (peg$c27.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c28); }
            }
          }
          if (s4 !== peg$FAILED) {
            s4 = input.substring(s3, peg$currPos);
          }
          s3 = s4;
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c29(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseobject_literal() {
      var s0;

      s0 = peg$parsepoint_literal();
      if (s0 === peg$FAILED) {
        s0 = peg$parseobject_2d_literal();
        if (s0 === peg$FAILED) {
          s0 = peg$parseintersection();
        }
      }

      return s0;
    }

    function peg$parseobject_2d_literal() {
      var s0;

      s0 = peg$parsecircle_literal();
      if (s0 === peg$FAILED) {
        s0 = peg$parseline_literal();
      }

      return s0;
    }

    function peg$parseobject_2d_reference() {
      var s0;

      s0 = peg$parsecircle_reference();
      if (s0 === peg$FAILED) {
        s0 = peg$parseline_reference();
      }

      return s0;
    }

    function peg$parsepoint() {
      var s0;

      s0 = peg$parsepoint_literal();
      if (s0 === peg$FAILED) {
        s0 = peg$parseintersection();
        if (s0 === peg$FAILED) {
          s0 = peg$parsepoint_reference();
        }
      }

      return s0;
    }

    function peg$parsepoint_reference() {
      var s0, s1, s2, s3, s4, s5;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseathe();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5).toLowerCase() === peg$c31) {
          s3 = input.substr(peg$currPos, 5);
          peg$currPos += 5;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parses();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parses();
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c7;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevariable();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c33(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }

      return s0;
    }

    function peg$parsepoint_literal() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseathe();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5).toLowerCase() === peg$c31) {
          s3 = input.substr(peg$currPos, 5);
          peg$currPos += 5;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parses();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parses();
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c7;
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s2 = peg$c35;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c36); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parses();
          if (s3 === peg$FAILED) {
            s3 = peg$c7;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsenumber();
            if (s4 !== peg$FAILED) {
              s5 = peg$parses();
              if (s5 === peg$FAILED) {
                s5 = peg$c7;
              }
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s6 = peg$c37;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parses();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c7;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parsenumber();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parses();
                      if (s9 === peg$FAILED) {
                        s9 = peg$c7;
                      }
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 41) {
                          s10 = peg$c39;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c40); }
                        }
                        if (s10 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c41(s4, s8);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }

      return s0;
    }

    function peg$parsecircle() {
      var s0;

      s0 = peg$parsecircle_reference();
      if (s0 === peg$FAILED) {
        s0 = peg$parsecircle_literal();
      }

      return s0;
    }

    function peg$parsecircle_reference() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6).toLowerCase() === peg$c43) {
        s1 = input.substr(peg$currPos, 6);
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsevariable();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c45(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c42); }
      }

      return s0;
    }

    function peg$parsecircle_literal() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parseathe();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6).toLowerCase() === peg$c43) {
          s2 = input.substr(peg$currPos, 6);
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c44); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsecircle_criterion();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$currPos;
                if (input.substr(peg$currPos, 3).toLowerCase() === peg$c47) {
                  s7 = input.substr(peg$currPos, 3);
                  peg$currPos += 3;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c48); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_();
                  if (s8 !== peg$FAILED) {
                    s7 = [s7, s8];
                    s6 = s7;
                  } else {
                    peg$currPos = s6;
                    s6 = peg$c0;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$c0;
                }
                if (s6 === peg$FAILED) {
                  s6 = peg$c7;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsecircle_criterion();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c49(s4, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c46); }
      }

      return s0;
    }

    function peg$parsecircle_criterion() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parsecenteredat();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsepoint();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c50(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsethrough();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsepoint();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c51(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseline() {
      var s0;

      s0 = peg$parseline_reference();
      if (s0 === peg$FAILED) {
        s0 = peg$parseline_literal();
      }

      return s0;
    }

    function peg$parseline_reference() {
      var s0, s1, s2, s3, s4, s5, s6;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parseathe();
      if (s1 !== peg$FAILED) {
        s2 = peg$parselineorseg();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsepoint_reference();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 45) {
                s5 = peg$c53;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c54); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parsepoint_reference();
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c55(s2, s4, s6);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parselineorseg();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsevariable();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c56(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }

      return s0;
    }

    function peg$parseline_literal() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parseathe();
      if (s1 !== peg$FAILED) {
        s2 = peg$parselineorseg();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsetwo_points();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c58(s2, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c57); }
      }

      return s0;
    }

    function peg$parselineorseg() {
      var s0, s1;

      if (input.substr(peg$currPos, 12).toLowerCase() === peg$c59) {
        s0 = input.substr(peg$currPos, 12);
        peg$currPos += 12;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c60); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 7).toLowerCase() === peg$c61) {
          s0 = input.substr(peg$currPos, 7);
          peg$currPos += 7;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c62); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 4).toLowerCase() === peg$c63) {
            s1 = input.substr(peg$currPos, 4);
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c64); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c65(s1);
          }
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parsetwo_points() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c66) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c67); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsepoint();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2).toLowerCase() === peg$c68) {
                s5 = input.substr(peg$currPos, 2);
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c69); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsepoint();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c70(s3, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsethrough();
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 13).toLowerCase() === peg$c71) {
            s1 = input.substr(peg$currPos, 13);
            peg$currPos += 13;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 7).toLowerCase() === peg$c73) {
              s1 = input.substr(peg$currPos, 7);
              peg$currPos += 7;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c74); }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 7).toLowerCase() === peg$c75) {
                s1 = input.substr(peg$currPos, 7);
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c76); }
              }
              if (s1 === peg$FAILED) {
                if (input.substr(peg$currPos, 14).toLowerCase() === peg$c77) {
                  s1 = input.substr(peg$currPos, 14);
                  peg$currPos += 14;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c78); }
                }
              }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsepoint();
            if (s3 !== peg$FAILED) {
              s4 = peg$currPos;
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                if (input.substr(peg$currPos, 3).toLowerCase() === peg$c47) {
                  s6 = input.substr(peg$currPos, 3);
                  peg$currPos += 3;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c48); }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    s5 = [s5, s6, s7];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c0;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
              if (s4 === peg$FAILED) {
                s4 = peg$currPos;
                s5 = [];
                s6 = peg$parses();
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parses();
                }
                if (s5 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s6 = peg$c37;
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c38); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = [];
                    s8 = peg$parses();
                    while (s8 !== peg$FAILED) {
                      s7.push(s8);
                      s8 = peg$parses();
                    }
                    if (s7 !== peg$FAILED) {
                      s5 = [s5, s6, s7];
                      s4 = s5;
                    } else {
                      peg$currPos = s4;
                      s4 = peg$c0;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c0;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsepoint();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c79(s3, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseintersection() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseathe();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 15).toLowerCase() === peg$c80) {
          s2 = input.substr(peg$currPos, 15);
          peg$currPos += 15;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c81); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseintersection_objects();
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseintersection_condition();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s5;
                  s6 = peg$c82(s7);
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$c0;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c0;
              }
              if (s5 === peg$FAILED) {
                s5 = peg$c7;
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c83(s4, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseintersection_objects() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseobject_2d_reference();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          if (input.substr(peg$currPos, 3).toLowerCase() === peg$c47) {
            s4 = input.substr(peg$currPos, 3);
            peg$currPos += 3;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c48); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s3 = [s3, s4, s5];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$currPos;
          s3 = [];
          s4 = peg$parses();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parses();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s4 = peg$c37;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c38); }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parses();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parses();
              }
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseobject_2d_reference();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c84(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsevariable();
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3).toLowerCase() === peg$c47) {
              s4 = input.substr(peg$currPos, 3);
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c48); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 === peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            s4 = peg$parses();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parses();
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s4 = peg$c37;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c38); }
              }
              if (s4 !== peg$FAILED) {
                s5 = [];
                s6 = peg$parses();
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parses();
                }
                if (s5 !== peg$FAILED) {
                  s3 = [s3, s4, s5];
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$c0;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsevariable();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c85(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseintersection_condition() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c86) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseisnt();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsevariable();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c88(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 10).toLowerCase() === peg$c89) {
          s1 = input.substr(peg$currPos, 10);
          peg$currPos += 10;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c90); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseobject_2d_reference();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c91(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsecalled() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 11).toLowerCase() === peg$c92) {
        s1 = input.substr(peg$currPos, 11);
        peg$currPos += 11;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c93); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 6).toLowerCase() === peg$c94) {
          s1 = input.substr(peg$currPos, 6);
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c95); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 5).toLowerCase() === peg$c96) {
            s1 = input.substr(peg$currPos, 5);
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c97); }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsevariable();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c98(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsecenteredat() {
      var s0;

      if (input.substr(peg$currPos, 11).toLowerCase() === peg$c99) {
        s0 = input.substr(peg$currPos, 11);
        peg$currPos += 11;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c100); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 11).toLowerCase() === peg$c101) {
          s0 = input.substr(peg$currPos, 11);
          peg$currPos += 11;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c102); }
        }
      }

      return s0;
    }

    function peg$parsearticle() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 97) {
        s0 = peg$c103;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c104); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c105) {
          s0 = peg$c105;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c106); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c107) {
            s0 = peg$c107;
            peg$currPos += 3;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c108); }
          }
        }
      }

      return s0;
    }

    function peg$parsethrough() {
      var s0;

      if (input.substr(peg$currPos, 7).toLowerCase() === peg$c109) {
        s0 = input.substr(peg$currPos, 7);
        peg$currPos += 7;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c110); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 10).toLowerCase() === peg$c111) {
          s0 = input.substr(peg$currPos, 10);
          peg$currPos += 10;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c112); }
        }
      }

      return s0;
    }

    function peg$parseisnt() {
      var s0;

      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c113) {
        s0 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c114); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c115) {
          s0 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c116); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 6).toLowerCase() === peg$c117) {
            s0 = input.substr(peg$currPos, 6);
            peg$currPos += 6;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c118); }
          }
        }
      }

      return s0;
    }

    function peg$parseathe() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsearticle();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$c7;
      }

      return s0;
    }

    function peg$parses() {
      var s0, s1;

      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 32) {
        s0 = peg$c120;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c121); }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c119); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      s1 = peg$parses();
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parses();
        }
      } else {
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c122); }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c124.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c125); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c124.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c125); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c126(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c123); }
      }

      return s0;
    }

    function peg$parsevariable() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c128.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c129); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c128.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c129); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c130(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c127); }
      }

      return s0;
    }


      // preprocess: 
      // normalize whitespace to single space / single newline
      
      function named(obj, name) {
        obj.name = name;
        return obj;
      }
      
      /* annotate the given object with source info */
      function o(obj) {
        obj.source = {
          text: text(),
          line: line(),
          column: column()
        }
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

},{}],16:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvYmVoYXZpb3IuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvY2FsYy5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9pbnRlcnNlY3Rpb24uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvY2lyY2xlLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2dlb20uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvaW5kZXguanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvaW50ZXJzZWN0aW9uLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2xpbmUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvcG9pbnQuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvc2VnbWVudC5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9wYXJzZS5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9yZW5kZXIuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvc2NlbmUuanMiLCJub2RlX21vZHVsZXMvZXVjbGlkLXBhcnNlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy91bmlxL3VuaXEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNDQSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXZCLFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRTtBQUNwQixHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFD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R0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxNQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRCxNQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztBQUN2RCxNQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQzs7QUFFdkQsTUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDM0MsTUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7O0FBRTNDLFNBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7Q0FDdEU7O0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFB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QUU7OztBQUVYLFFBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUM5QixLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQzVCLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFDeEIsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUUvQixRQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNmLFVBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLFFBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixRQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ1I7QUFDRCxRQUFJLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTs7QUFFdkQsUUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzNCO0FBQ0QsUUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7O0FBRTFELFFBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM3Qjs7QUFFRCxRQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNmLFVBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLFFBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixRQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ1I7QUFDRCxRQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTs7QUFFcEQsUUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCO0FBQ0QsUUFBSSxNQUFNLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7O0FBRTdELFFBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUMvQjs7QUFFRCxRQUFJLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hDLFdBQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0FBQ3RCLFdBQU8sT0FBTyxDQUFDO0dBQ2hCOztTQTFFRyxPQUFPO0dBQVMsSUFBSTs7Ozs7QUE4RTFCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDOzs7OztBQ2xGekIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDOztBQUV0QyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7QUFDekMsV0FBUyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUM1QixRQUFJLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixRQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDZixTQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQzVCLFNBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDaEMsU0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztLQUM3QjtBQUNELFVBQU0sR0FBRyxDQUFDO0dBQ1g7O0FBRUQsV0FBUyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRTtBQUU1QixRQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDYixVQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3hCLGVBQU8sSUFBSSxDQUFDLElBQUksQ0FBQztPQUNsQixNQUFNO0FBQ0wsYUFBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDNUM7S0FDRixNQUFNO0FBQ0wsVUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUM1QixhQUFLLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDLENBQUM7T0FDcEM7QUFDRCxXQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pCLGFBQU8sS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMxQixXQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7S0FDYjtHQUNGOztBQUVELFdBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7QUFDMUIsWUFBUSxJQUFJLENBQUMsSUFBSTtBQUNmLFdBQUssT0FBTztBQUNWLGFBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLGVBQU8sSUFBSSxDQUFDLElBQUksQ0FBQztBQUNqQixjQUFNO0FBQUEsQUFDUixXQUFLLE9BQU87QUFDVixhQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsY0FBTTtBQUFBLEFBQ1IsV0FBSyxNQUFNO0FBQ1QsYUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEYsY0FBTTtBQUFBLEFBQ1IsV0FBSyxTQUFTO0FBQ1osYUFBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekYsY0FBTTtBQUFBLEFBQ1IsV0FBSyxRQUFRO0FBQ1gsYUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDekYsY0FBTTtBQUFBLEFBQ1IsV0FBSyxjQUFjO0FBQ2pCLFlBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztBQUNkLFlBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxLQUFLLEVBQ3ZDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXpDLHNDQUNFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMvQixPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN6QyxjQUFNO0FBQUEsS0FDVDs7QUFFRCxXQUFPLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7R0FDMUI7O0FBRUQsTUFBSSxhQUFhLEdBQUcsRUFBRSxFQUNwQixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFM0IsTUFBSTs7OztBQUdGLFdBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3JDLGFBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDM0IsWUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMzQixhQUFhLENBQUMsSUFBSSxDQUFDO0FBQ2pCLGNBQUksRUFBRSxPQUFPO0FBQ2IsY0FBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzVCLENBQUMsQ0FBQyxLQUNBLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQzFCLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2pEOzs7QUFHRCxVQUFJLFdBQVcsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQztlQUFJLENBQUMsQ0FBQyxJQUFJO09BQUEsQ0FBQyxDQUFDO0FBQ2pELFdBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQ2xCLE1BQU0sQ0FBQyxVQUFBLElBQUk7ZUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7T0FBQSxDQUFDLENBQzdDLE9BQU8sQ0FBQyxVQUFBLElBQUk7ZUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7T0FBQSxDQUFDLENBQUM7OztBQUdoRCxXQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM3QyxhQUFLLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQzdCOztBQUVELFVBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7O0FBRWpCO0FBQ0E7O0VBRUg7Ozs7O0FDL0ZELElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtXQUNpQixPQUFPLENBQUMsU0FBUyxDQUFDOztJQUFuRCxLQUFLLFFBQUwsS0FBSztJQUFFLE1BQU0sUUFBTixNQUFNO0lBQUUsT0FBTyxRQUFQLE9BQU87SUFBRSxJQUFJLFFBQUosSUFBSTs7O0FBRWxDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDOztBQUUxQixTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFO0FBQ25DLE1BQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRWhDLFdBQVMsS0FBSyxHQUFHO0FBQ2YsUUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFFLENBQ3BDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBQSxDQUFDO2FBQUUsQ0FBQyxDQUFDLENBQUM7S0FBQSxDQUFDLENBQ2xCLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBQSxDQUFDO2FBQUUsQ0FBQyxDQUFDLENBQUM7S0FBQSxDQUFDLENBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBQSxDQUFDO2FBQUUsQ0FBQztLQUFBLENBQUMsQ0FBQTtBQUNoQixXQUFPLElBQUksQ0FBQztHQUNiOztBQUVELFdBQVMsT0FBTyxHQUFHO0FBQ2pCLFFBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEQsV0FBTyxVQUFBLENBQUM7YUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0tBQUEsQ0FBQztHQUN4RTs7QUFFRCxXQUFTLE1BQU0sR0FBRzs7QUFFaEIsUUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDO2FBQUksQ0FBQyxZQUFZLE1BQU07S0FBQSxDQUFDLENBQUMsQ0FBQzs7QUFFeEQsUUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FDNUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2IsZUFBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3JELGVBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQzs7QUFFdEQsV0FBTyxDQUNOLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQ2hDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FDbkIsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFBLENBQUM7YUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7S0FBQSxDQUFDLENBQzNCLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBQSxDQUFDO2FBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQUEsQ0FBQyxDQUMzQixJQUFJLENBQUMsR0FBRyxFQUFFLFVBQUEsQ0FBQzthQUFJLENBQUMsQ0FBQyxNQUFNO0tBQUEsQ0FBQyxDQUFBOztBQUV6QixXQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7OztBQUd4QixRQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLENBQUM7YUFBRSxDQUFDLFlBQVksSUFBSTtLQUFBLENBQUMsQ0FBQyxDQUFDOztBQUVwRCxRQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUN4QyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDYixhQUFTLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQzthQUFFLENBQUMsWUFBWSxPQUFPO0tBQUEsQ0FBQyxDQUN4QyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtBQUMxQyxhQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDakQsYUFBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDOzs7QUFHbEQsYUFBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRTtBQUM5QixhQUFPLFVBQUEsQ0FBQyxFQUFFO0FBQ1IsWUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLE9BQU8sR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztPQUMxQixDQUFBO0tBQ0Y7O0FBRUQsU0FBSyxDQUNKLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQzlCLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FDakIsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQzNCLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUMzQixJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FDM0IsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7O0FBRTVCLFNBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7O0FBR3RCLFFBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQ3pDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQzthQUFFLENBQUMsWUFBWSxLQUFLO0tBQUEsQ0FBQyxDQUFDLENBQ25ELElBQUksQ0FBQyxVQUFDLENBQUMsRUFBQyxDQUFDO2FBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUFBLENBQUMsQ0FBQTtBQUNqRCxVQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQy9CLFVBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFYixVQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7Ozs7QUFJdkIsYUFBUyxTQUFTLEdBQUc7QUFBRSxRQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FBRTtBQUNqRSxhQUFTLFFBQVEsR0FBRztBQUFFLFFBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUFFO0FBQ2pFLGFBQVMsS0FBSyxHQUFHO0FBQ2YsVUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN6RCxhQUFPLElBQUksQ0FBQztLQUNiO0dBQ0Y7O0FBRUQsU0FBTyxNQUFNLENBQUM7Q0FDZjs7Ozs7OztJQzVGRyxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQzs7V0FPZCxPQUFPLENBQUMsU0FBUyxDQUFDOztJQUxwQixLQUFLLFFBQUwsS0FBSztJQUNMLElBQUksUUFBSixJQUFJO0lBQ0osT0FBTyxRQUFQLE9BQU87SUFDUCxNQUFNLFFBQU4sTUFBTTtJQUNOLFdBQVcsUUFBWCxXQUFXO0lBRWIsWUFBWSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQzs7Ozs7QUFHbEQsU0FBUyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUM1QixLQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RDLEtBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ3hCOztJQUVLLEtBQUs7TUFBTCxLQUFLLEdBRUUsU0FGUCxLQUFLLENBRUcsTUFBTSxFQUFFO0FBQ2xCLFFBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBQ3JCLFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3pELFFBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDOztBQUUxRCxRQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUNsQixRQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN6QixRQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsUUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7R0FDZjs7QUFYRyxPQUFLLFdBY1QsTUFBTSxHQUFBLFlBQUc7QUFDUCxXQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQzthQUFJLENBQUMsWUFBWSxLQUFLO0tBQUEsQ0FBQyxDQUFBO0dBQzlEOztBQWhCRyxPQUFLLFdBbUJULE9BQU8sR0FBQSxZQUFHO0FBQ1IsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO0dBQy9COztBQXJCRyxPQUFLLFdBeUJULElBQUksR0FBQSxVQUFDLEdBQUcsRUFBRTtBQUNSLFFBQUksUUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDckMsU0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDdEMsVUFBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxPQUFPLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuRDtBQUNELFdBQU8sSUFBSSxDQUFDO0dBQ2I7O0FBL0JHLE9BQUssV0F1Q1QsRUFBRSxHQUFBLFVBQUMsR0FBRyxFQUFFOztBQUNOLFFBQUcsT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO0FBQUUsU0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7S0FBRTtBQUNwRCxXQUFPLFVBQUMsU0FBUzthQUFLLENBQUMsR0FBRyxJQUFJLE1BQUssS0FBSyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztLQUFBLENBQUM7OztBQXpDeEQsT0FBSyxXQWtEVCxJQUFJLEdBQUEsVUFBQyxHQUFHLEVBQUU7O0FBQ1IsUUFBRyxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7QUFBRSxTQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUFFO0FBQ3BELFdBQU8sVUFBQyxTQUFTO2FBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFLLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FBQSxDQUFDO0dBQzVEOztBQXJERyxPQUFLLFdBdURULElBQUksR0FBQSxZQUFHO0FBQ0wsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0dBQ25COztBQXpERyxPQUFLLFdBMkRULEdBQUcsR0FBQSxVQUFDLElBQUksRUFBRTtBQUNSLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDaEM7O0FBN0RHLE9BQUssV0ErRFQsS0FBSyxHQUFBLFVBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDaEIsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUN4Qzs7QUFqRUcsT0FBSyxXQW1FVCxNQUFNLEdBQUEsVUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRTtBQUNqQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDN0U7O0FBckVHLE9BQUssV0F1RVQsT0FBTyxHQUFBLFVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDdEIsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ2xFOztBQXpFRyxPQUFLLFdBMkVULElBQUksR0FBQSxVQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ25CLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUMvRDs7QUE3RUcsT0FBSyxXQStFVCxZQUFZLEdBQUEsVUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDbEMsUUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFDbEIsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkIsUUFBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixHQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xELFFBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsR0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFbEQsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7R0FDeEQ7O0FBdEZHLE9BQUssV0F3RlQsS0FBSyxHQUFBLFVBQUMsR0FBRyxFQUFFO0FBQ1QsUUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7QUFDdkIsV0FBTyxJQUFJLENBQUM7R0FDYjs7QUEzRkcsT0FBSyxXQTZGVCxHQUFHLEdBQUEsVUFBQyxNQUFNLEVBQUU7OztBQUdWLFFBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QyxRQUFJLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdkUsV0FBSSxJQUFJLElBQUksSUFBSSxNQUFNO0FBQUUsZ0JBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7T0FBQSxBQUN0RCxNQUFNLEdBQUcsUUFBUSxDQUFDO0tBQ25COzs7U0FHSSxJQUFHLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7QUFDbEQsYUFBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUMsTUFBTSxHQUFDLE9BQU8sR0FBQyxRQUFRLEdBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUM3RSxhQUFPLElBQUksQ0FBQztLQUNiOztTQUVJO0FBQ0gsWUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM3QyxVQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ3hDOztBQUVELFFBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxRQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQzs7QUFFaEQsUUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs7QUFFcEIsUUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFDcEIsV0FBTyxJQUFJLENBQUM7R0FDYjs7QUF4SEcsT0FBSyxXQTBIVCxRQUFRLEdBQUEsWUFBRztBQUNULFFBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQy9CLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDUCxXQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUMzQyxXQUFPLFFBQVEsR0FBQyxFQUFFLENBQUM7R0FDcEI7O0FBL0hHLE9BQUssV0F3SVQsTUFBTSxHQUFBLFVBQUMsSUFBSSxFQUFFO0FBQ1gsUUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FDbkIsTUFBTSxDQUFDLFVBQUEsR0FBRzthQUFJLEdBQUcsWUFBWSxZQUFZO0tBQUEsQ0FBQyxDQUMxQyxPQUFPLENBQUMsVUFBQSxHQUFHO2FBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtLQUFBLENBQUMsQ0FBQTtHQUNoQzs7QUE1SUcsT0FBSyxXQThJVCxRQUFRLEdBQUEsVUFBQyxLQUFLLEVBQUU7QUFDZCxRQUFJLElBQUksR0FBRyxJQUFJLENBQUM7QUFDaEIsUUFBSSxTQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNyQyxRQUFJLE9BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7O0FBRTNCLFFBQUksS0FBSyxHQUFHO0FBQ1YsV0FBSyxFQUFMLEtBQUs7QUFDTCxVQUFJLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO0FBQzdCLGFBQU8sRUFBRSxTQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQztlQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUU7T0FBQSxDQUFDLEVBQ3hDLENBQUE7QUFDRCxRQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUN0Qjs7U0F6SkcsS0FBSzs7O0FBNEpYLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDOzs7OztBQzdLdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2dEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxudmFyIGQzID0gcmVxdWlyZSgnZDMnKTtcblxuZnVuY3Rpb24gdHJhbnNsYXRlKHApIHtcbiAgcC54ICs9IGQzLmV2ZW50LmR4O1xuICBwLnkgKz0gZDMuZXZlbnQuZHk7XG59XG5cblxuZnVuY3Rpb24gcG9pbnQodXBkYXRlKSB7XG4gIHJldHVybiBkMy5iZWhhdmlvci5kcmFnKClcbiAgLm9uKCdkcmFnJywgZnVuY3Rpb24oZCkge1xuICAgIGQueCA9IGQzLmV2ZW50Lng7XG4gICAgZC55ID0gZDMuZXZlbnQueTtcbiAgICB1cGRhdGUoKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNpcmNsZSh1cGRhdGUpIHtcbiAgcmV0dXJuIGQzLmJlaGF2aW9yLmRyYWcoKVxuICAub24oJ2RyYWcnLCBmdW5jdGlvbihkKSB7XG4gICAgaWYoZC5ib3VuZGFyeVBvaW50KSB7XG4gICAgICBpZihkLmJvdW5kYXJ5UG9pbnQuZnJlZSAmJiBkLmNlbnRlci5mcmVlKSB7XG4gICAgICAgIHRyYW5zbGF0ZShkLmNlbnRlcik7XG4gICAgICAgIHRyYW5zbGF0ZShkLmJvdW5kYXJ5UG9pbnQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7IHJldHVybjsgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGxldCBkeCA9IGQuY2VudGVyLnggLSBkMy5ldmVudC54O1xuICAgICAgbGV0IGR5ID0gZC5jZW50ZXIueSAtIGQzLmV2ZW50Lnk7XG4gICAgICBkLnJhZGl1cyA9IE1hdGguc3FydChkeCpkeCArIGR5KmR5KTtcbiAgICB9XG4gICAgdXBkYXRlKCk7XG4gIH0pXG59XG4gIFxuZnVuY3Rpb24gbGluZSh1cGRhdGUpIHtcbiAgcmV0dXJuIGQzLmJlaGF2aW9yLmRyYWcoKVxuICAub24oJ2RyYWcnLCBmdW5jdGlvbihkKSB7XG4gICAgaWYoZC5fcC5zb21lKHA9PiFwLmZyZWUpKSB7IHJldHVybjsgfVxuICAgIGQuX3AuZm9yRWFjaCh0cmFuc2xhdGUpOyAvLyBUT0RPOiBhdm9pZCBhY2Nlc3NpbmcgcHJpdmF0ZSBfcC4uLi5cbiAgICB1cGRhdGUoKTtcbiAgfSlcbn1cblxuZnVuY3Rpb24gZm9sbG93KHN2ZywgcG9pbnQsIHVwZGF0ZSkge1xuICBsZXQgZm9sbG93aW5nID0gZmFsc2U7XG4gIGxldCB7eDogbW91c2V4LCB5OiBtb3VzZXl9ID0gcG9pbnQ7XG4gIGQzLnNlbGVjdCgnYm9keScpLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpIHtcbiAgICAoW21vdXNleCwgbW91c2V5XSA9IGQzLm1vdXNlKHN2ZykpO1xuICAgIGlmKCFmb2xsb3dpbmcpIHN0ZXAoKTtcbiAgfSk7XG4gIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgbGV0IGR4ID0gKG1vdXNleCAtIHBvaW50LngpLFxuICAgICAgZHkgPSAobW91c2V5IC0gcG9pbnQueSksXG4gICAgICBkc3EgPSBkeCpkeCArIGR5KmR5LFxuICAgICAgZCA9IE1hdGguc3FydChkc3EpO1xuICAgIFxuICAgIGlmKGQgPiAxMCkge1xuICAgICAgZm9sbG93aW5nID0gdHJ1ZTtcbiAgICAgIHBvaW50LnggKz0gZHgvZDtcbiAgICAgIHBvaW50LnkgKz0gZHkvZDtcbiAgICAgIHVwZGF0ZSgpO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBmb2xsb3dpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbW92ZTogeyBjaXJjbGUsIGxpbmUsIHBvaW50IH0sXG4gIGZvbGxvd1xufVxuIiwiXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkaXN0YW5jZSxcbiAgZGlzdGFuY2VTcXVhcmVkXG59XG5cbi8qIHJldHVybnMgdGhlIEV1Y2xpZGVhbiBkaXN0YW5jZSBiZXR3ZWVuIChwMS54LCBwMS55KSBhbmQgKHAyLngsIHAyLnkpICovXG5mdW5jdGlvbiBkaXN0YW5jZShwMSwgcDIpIHtcbiAgcmV0dXJuIE1hdGguc3FydChkaXN0YW5jZVNxdWFyZWQocDEsIHAyKSk7XG59XG5cbi8qIHJldHVybnMgdGhlIHNxdWFyZWQgRXVjbGlkZWFuIGRpc3RhbmNlIGJldHdlZW4gKHAxLngsIHAxLnkpIGFuZCAocDIueCwgcDIueSkgKi9cbmZ1bmN0aW9uIGRpc3RhbmNlU3F1YXJlZChwMSwgcDIpIHtcbiAgbGV0IGR4ID0gcDEueCAtIHAyLngsXG4gICAgICBkeSA9IHAxLnkgLSBwMi55O1xuICByZXR1cm4gZHgqZHggKyBkeSpkeTtcbn1cbiIsIlxubGV0IHVuaXEgPSByZXF1aXJlKCd1bmlxJyk7XG5cbmxldCB7UG9pbnQsIExpbmUsIFNlZ21lbnQsIENpcmNsZX0gPSByZXF1aXJlKCcuL21vZGVsJyksXG4gICAgUCA9IFBvaW50LlAsXG4gICAgZGQgPSByZXF1aXJlKCcuL2NhbGMnKS5kaXN0YW5jZVNxdWFyZWQ7XG5cbi8qIGhlbHBlcnMgKi9cbmZ1bmN0aW9uIGNvbXBhcmVQb2ludHMocCwgcSkgeyByZXR1cm4gKHAueCA9PT0gcS54ICYmIHAueSA9PT0gcS55KSA/IDAgOiAxOyB9XG5mdW5jdGlvbiBzcShhKSB7IHJldHVybiBhKmE7IH1cbmZ1bmN0aW9uIGJldHdlZW4oeCwgYSwgYikge1xuICBsZXQgbGVmdCA9IE1hdGgubWluKGEsYiksXG4gICAgICByaWdodCA9IE1hdGgubWF4KGEsYik7XG4gIHJldHVybiAobGVmdCA8PSB4ICYmIHggPD0gcmlnaHQpXG59XG5cbi8qXG4gIEludGVyc2VjdGlvbiBvZiB0d28gb2JqZWN0czsgcmV0dXJucyBhbiBhcnJheSwgcG9zc2libHkgZW1wdHksIG9mIFxuICBpbnRlcnNlY3Rpb24gcG9pbnRzLlxuKi9cblxuLyoqXG4gKiBpbnRlcnNlY3QgLSBGaW5kIHRoZSBpbnRlcnNlY3Rpb24ocykgb2YgdGhlIGdpdmVuIHR3byBvYmplY3RzLlxuICogIFxuICogQHBhcmFtICB7R2VvbX0gbzEgZmlyc3Qgb2JqZWN0IFxuICogQHBhcmFtICB7R2VvbX0gbzIgc2Vjb25kIG9iamVjdCBcbiAqIEByZXR1cm4ge0FycmF5LjxQb2ludD59ICAgIFBvaW50cyBvZiBpbnRlcnNlY3Rpb24gYmV0d2VlbiB0aGUgdHdvIG9iamVjdHMuIFxuICovIFxuZnVuY3Rpb24gaW50ZXJzZWN0KG8xLCBvMikge1xuICBpZihvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIENpcmNsZSkgICAgICAgIC8vIGNpcmNsZS1jaXJjbGVcbiAgICByZXR1cm4gaW50ZXJzZWN0Q2lyY2xlQ2lyY2xlKG8xLCBvMik7XG4gIC8vIGlmIG9ubHkgb25lIGlzIGEgY2lyY2xlLCBpdCBzaG91bGQgYmUgZmlyc3QuXG4gIGVsc2UgaWYobzIgaW5zdGFuY2VvZiBDaXJjbGUpXG4gICAgcmV0dXJuIGludGVyc2VjdChvMiwgbzEpOyBcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIFNlZ21lbnQpICAvLyBjaXJjbGUtc2VnbWVudFxuICAgIHJldHVybiBpbnRlcnNlY3RDaXJjbGVMaW5lKG8xLCBvMiwgdHJ1ZSk7XG4gIGVsc2UgaWYobzEgaW5zdGFuY2VvZiBDaXJjbGUgJiYgbzIgaW5zdGFuY2VvZiBMaW5lKSAgICAgLy8gY2lyY2xlLWxpbmVcbiAgICByZXR1cm4gaW50ZXJzZWN0Q2lyY2xlTGluZShvMSwgbzIsIGZhbHNlKTtcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIFNlZ21lbnQgJiYgbzIgaW5zdGFuY2VvZiBTZWdtZW50KSAvLyBzZWdtZW50LXNlZ21lbnRcbiAgICByZXR1cm4gaW50ZXJzZWN0TGluZUxpbmUobzEsIG8yLCB0cnVlKTtcbiAgLy8gaWYgb25seSBvbmUgaXMgYSBzZWdtZW50LCBpdCBzaG91bGQgYmUgZmlyc3QuXG4gIGVsc2UgaWYobzIgaW5zdGFuY2VvZiBTZWdtZW50KVxuICAgIHJldHVybiBpbnRlcnNlY3QobzIsIG8xKTtcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIExpbmUgJiYgbzIgaW5zdGFuY2VvZiBMaW5lKSAgICAgICAvLyBsaW5lLWxpbmVcbiAgICByZXR1cm4gaW50ZXJzZWN0TGluZUxpbmUobzEsIG8yLCBmYWxzZSk7XG5cbiAgLy8gVE9ETzogY2lyY2xlLXBvaW50LCBzZWdtZW50LXBvaW50LCBwb2ludC1wb2ludFxuICBlbHNlIGlmKG8yIGluc3RhbmNlb2YgUG9pbnQgfHwgbzEgaW5zdGFuY2VvZiBQb2ludClcbiAgICByZXR1cm4gW107XG4gICAgXG4gIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgaW50ZXJzZWN0ICcgKyBcbiAgICBvMS5jb25zdHJ1Y3Rvci5uYW1lICsgJyBhbmQgJyArIG8yLmNvbnN0cnVjdG9yLm5hbWUpO1xuICBcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0Q2lyY2xlQ2lyY2xlKGMxLCBjMikge1xuICBsZXQgZHNxID0gZGQoYzEuY2VudGVyLCBjMi5jZW50ZXIpO1xuICBsZXQgZCA9IE1hdGguc3FydChkc3EpO1xuICBcbiAgaWYoZCA+IGMxLnJhZGl1cyArIGMyLnJhZGl1cykgeyByZXR1cm4gW107IH1cbiAgZWxzZSBpZihkIDwgYzEucmFkaXVzIC0gYzIucmFkaXVzKSB7IHJldHVybiBbXTsgfVxuICBlbHNlIGlmKGRzcSA9PT0gMCkgeyByZXR1cm4gW107IH1cbiAgICBcbiAgbGV0IGEgPSAoYzEucmFkaXVzc3EgLSBjMi5yYWRpdXNzcSArIGRzcSkgLyAoMipkKTtcbiAgbGV0IGggPSBNYXRoLnNxcnQoTWF0aC5tYXgoYzEucmFkaXVzc3EgLSBzcShhKSwgMCkpO1xuICBsZXQgY3ggPSBjMS5jZW50ZXIueCArIGEqKGMyLmNlbnRlci54IC0gYzEuY2VudGVyLngpL2Q7XG4gIGxldCBjeSA9IGMxLmNlbnRlci55ICsgYSooYzIuY2VudGVyLnkgLSBjMS5jZW50ZXIueSkvZDtcbiAgXG4gIGxldCBueCA9IGggKiAoYzEuY2VudGVyLnkgLSBjMi5jZW50ZXIueSkvZDtcbiAgbGV0IG55ID0gaCAqIChjMS5jZW50ZXIueCAtIGMyLmNlbnRlci54KS9kO1xuICBcbiAgcmV0dXJuIHVuaXEoW1AoMCwgY3grbngsIGN5LW55KSwgUCgxLCBjeC1ueCwgY3krbnkpXSwgY29tcGFyZVBvaW50cyk7XG59XG5cbmZ1bmN0aW9uIGludGVyc2VjdExpbmVMaW5lKHMxLCBzMiwgY2xpcCkge1xuICBsZXQgW3t4OngxLCB5OnkxfSwge3g6eDIsIHk6eTJ9XSA9IHMxLl9wO1xuICBsZXQgW3t4OngzLCB5OnkzfSwge3g6eDQsIHk6eTR9XSA9IHMyLl9wO1xuICBsZXQgcyA9ICgtczEuZHkgKiAoeDEgLSB4MykgKyBzMS5keCAqICh5MSAtIHkzKSkgLyAoLXMyLmR4ICogczEuZHkgKyBzMS5keCAqIHMyLmR5KVxuICBsZXQgdCA9IChzMi5keCAqICh5MSAtIHkzKSAtIHMyLmR5ICogKHgxIC0geDMpKSAvICgtczIuZHggKiBzMS5keSArIHMxLmR4ICogczIuZHkpXG4gIFxuICBpZighY2xpcCB8fCAoYmV0d2VlbihzLDAsMSkgJiYgYmV0d2Vlbih0LDAsMSkpKVxuICAgIHJldHVybiBbUCgwLCB4MSArIHQqczEuZHgsIHkxICsgdCpzMS5keSldXG4gIGVsc2VcbiAgICByZXR1cm4gW107IC8vIG5vIGNvbGxpc2lvblxufVxuXG4vKiBodHRwOi8vbWF0aHdvcmxkLndvbGZyYW0uY29tL0NpcmNsZS1MaW5lSW50ZXJzZWN0aW9uLmh0bWwgKi9cbmZ1bmN0aW9uIGludGVyc2VjdENpcmNsZUxpbmUoYywgcywgY2xpcCkge1xuICBsZXQgW3t4OngxLCB5OnkxfSwge3g6eDIsIHk6eTJ9XSA9IHMuX3A7XG4gIGxldCB7eDp4MCwgeTp5MH0gPSBjLmNlbnRlcjtcblxuICAvLyBub3RlIHRoZSB0cmFuc2xhdGlvbiAoeDAsIHkwKS0+KDAsMCkuXG4gIGxldCBEID0gKHgxLXgwKSooeTIteTApIC0gKHgyLXgwKSooeTEteTApO1xuICBsZXQgRHNxID0gc3EoRCk7XG4gICAgXG4gIGxldCBsZW5zcSA9IHNxKHMuZHgpK3NxKHMuZHkpO1xuICBsZXQgZGlzYyA9IE1hdGguc3FydChzcShjLnJhZGl1cykqbGVuc3EgLSBEc3EpO1xuICBpZihkaXNjIDwgMCkgeyByZXR1cm4gW107IH1cblxuICBsZXQgY3ggPSBEKnMuZHkgLyBsZW5zcSwgY3kgPSAtRCpzLmR4IC8gbGVuc3E7XG4gIGxldCBueCA9IChzLmR5IDwgMCA/IC0xKnMuZHggOiBzLmR4KSAqIGRpc2MgLyBsZW5zcSxcbiAgICAgIG55ID0gTWF0aC5hYnMocy5keSkgKiBkaXNjIC8gbGVuc3E7XG5cbiAgLy8gdHJhbnNsYXRlICgwLDApLT4oeDAsIHkwKS5cbiAgcmV0dXJuIHVuaXEoW1AoMCwgY3ggKyBueCArIHgwLCBjeSArIG55ICsgeTApLCBcbiAgICAgICAgICAgICAgIFAoMSwgY3ggLSBueCArIHgwLCBjeSAtIG55ICsgeTApXSwgY29tcGFyZVBvaW50cylcbiAgICAgICAgLmZpbHRlcihwID0+IChjbGlwID8gYmV0d2VlbihwLngseDEseDIpICYmIGJldHdlZW4ocC55LHkxLHkyKSA6IHRydWUpKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW50ZXJzZWN0LFxuICBpbnRlcnNlY3RDaXJjbGVDaXJjbGUsXG4gIGludGVyc2VjdENpcmNsZUxpbmUsXG4gIGludGVyc2VjdExpbmVMaW5lfVxuICBcbiIsImxldCBHZW9tID0gcmVxdWlyZSgnLi9nZW9tJyksXG4gICAgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50JyksXG4gICAgU2VnbWVudCA9IHJlcXVpcmUoJy4vc2VnbWVudCcpLFxuICAgIHtkaXN0YW5jZSwgZGlzdGFuY2VTcXVhcmVkfSA9IHJlcXVpcmUoJy4uL2NhbGMnKTtcblxuY2xhc3MgQ2lyY2xlIGV4dGVuZHMgR2VvbSB7XG4gIFxuICBjb25zdHJ1Y3RvcihuYW1lLCBjZW50ZXIsIGEpIHtcbiAgICBpZih0eXBlb2YgYSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGEgPSBjZW50ZXI7XG4gICAgICBjZW50ZXIgPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIHN1cGVyKG5hbWUpO1xuICAgIHRoaXMuY2VudGVyID0gY2VudGVyO1xuICAgIGlmIChhIGluc3RhbmNlb2YgUG9pbnQpIHtcbiAgICAgIHRoaXMuX2Zyb21DZW50ZXJBbmRCb3VuZGFyeVBvaW50KGNlbnRlciwgYSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHRoaXMuX2Zyb21DZW50ZXJBbmRSYWRpdXMoY2VudGVyLCBhKTtcbiAgICB9XG4gIH1cbiAgXG4gIF9mcm9tQ2VudGVyQW5kUmFkaXVzKGNlbnRlciwgcmFkaXVzKSB7XG4gICAgdGhpcy5yYWRpdXMgPSByYWRpdXM7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgcmFkaXVzc3E6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJhZGl1cyAqIHRoaXMucmFkaXVzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgXG4gIF9mcm9tQ2VudGVyQW5kQm91bmRhcnlQb2ludChjZW50ZXIsIGJvdW5kYXJ5UG9pbnQpIHtcbiAgICB0aGlzLmJvdW5kYXJ5UG9pbnQgPSBib3VuZGFyeVBvaW50O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgIHJhZGl1czoge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGRpc3RhbmNlKHRoaXMuYm91bmRhcnlQb2ludCwgdGhpcy5jZW50ZXIpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmFkaXVzc3E6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBkaXN0YW5jZVNxdWFyZWQodGhpcy5ib3VuZGFyeVBvaW50LCB0aGlzLmNlbnRlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG4gIFxuICB5KHgpIHtcbiAgICB2YXIgdyA9IE1hdGguYWJzKHggLSB0aGlzLmNlbnRlci54KTtcbiAgICBpZiAodyA+IHRoaXMucmFkaXVzKSByZXR1cm4gbnVsbDtcbiAgICBpZiAodyA9PT0gdGhpcy5yYWRpdXMpIHJldHVybiBuZXcgUG9pbnQoeCwgdGhpcy5jZW50ZXIueSk7XG4gICAgXG4gICAgdmFyIGggPSBNYXRoLnNxcnQodGhpcy5yYWRpdXMgKiB0aGlzLnJhZGl1cyAtIHcgKiB3KTtcbiAgICByZXR1cm4gW3RoaXMuY2VudGVyLnkgKyBoLCB0aGlzLmNlbnRlci55IC0gaF07XG4gIH1cbiAgXG4gIGNvbnRhaW5zKHApIHtcbiAgICByZXR1cm4gZGlzdGFuY2VTcXVhcmVkKHAsIHRoaXMuY2VudGVyKSA9PT0gdGhpcy5yYWRpdXNzcTtcbiAgfVxuICBcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdDaXJjbGUnICsgc3VwZXIudG9TdHJpbmcoKSArICdbJyArIHRoaXMuY2VudGVyLnRvU3RyaW5nKCkgKyAnOycgKyB0aGlzLnJhZGl1cyArICddJztcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENpcmNsZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gY2xhc3MgR2VvbSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICB9XG4gIFxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lO1xuICB9XG59XG4iLCJcbmxldCBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKSxcbiAgICBDaXJjbGUgPSByZXF1aXJlKCcuL2NpcmNsZScpLFxuICAgIExpbmUgPSByZXF1aXJlKCcuL2xpbmUnKSxcbiAgICBTZWdtZW50ID0gcmVxdWlyZSgnLi9zZWdtZW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBQOiBQb2ludC5QLFxuICBQb2ludCxcbiAgQ2lyY2xlLFxuICBTZWdtZW50LFxuICBMaW5lLFxuICBlcXVhbFdpdGhpblxufTtcblxuXG4vKiByZXR1cm4gYSBkZWVwLWVxdWFsaXR5IHRlc3QgZnVuY3Rpb24gdGhhdCBjaGVja3MgZm9yIGdlb21ldHJpYyBvYmplY3RcbiAgIGVxdWFsaXR5IHVzaW5nIHRoZSBnaXZlbiBkaXN0YW5jZSB0aHJlc2hvbGQgZm9yIHBvaW50IGVxdWFsaXR5OyBpLmUuLCBpZiBcbiAgIHR3byBwb2ludHMgYXJlIGNsb3NlciB0aGFuIGB0aHJlc2hvbGRgLCBjb25zaWRlciB0aGVtIGVxdWFsLiAqL1xuZnVuY3Rpb24gZXF1YWxXaXRoaW4odGhyZXNob2xkKSB7XG4gIHRocmVzaG9sZCA9IHRocmVzaG9sZCB8fCAwO1xuICByZXR1cm4gZnVuY3Rpb24gZXF1YWwobzEsIG8yKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobzEpICYmIEFycmF5LmlzQXJyYXkobzIpKSB7XG4gICAgICByZXR1cm4gbzEuZXZlcnkoKG9iaiwgaW5kZXgpID0+IGVxdWFsKG9iaiwgbzJbaW5kZXhdKSlcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvMSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIG8yID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIE1hdGguYWJzKG8xIC0gbzIpIDwgdGhyZXNob2xkO1xuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBQb2ludCAmJiBvMiBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgICBpZihvMS54ID09PSBudWxsIHx8IG8yLnggPT09IG51bGwgfHwgbzEueSA9PT0gbnVsbCB8fCBvMi55ID09PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiBlcXVhbChNYXRoLmFicyhvMS54IC0gbzIueCkgKyBNYXRoLmFicyhvMS55IC0gbzIueSksIDApO1xuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBDaXJjbGUgJiYgbzIgaW5zdGFuY2VvZiBDaXJjbGUpIHtcbiAgICAgIHJldHVybiBlcXVhbChvMS5yYWRpdXMsIG8yLnJhZGl1cykgJiYgZXF1YWwobzEuY2VudGVyLCBvMi5jZW50ZXIpO1xuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBTZWdtZW50ICYmIG8yIGluc3RhbmNlb2YgU2VnbWVudCkge1xuICAgICAgdmFyIHAxID0gW10uY29uY2F0KG8xLnApLFxuICAgICAgICAgIHAyID0gW10uY29uY2F0KG8yLnApXG4gICAgICAvLyBlbnN1cmUgcG9pbnRzIGZyb20gYm90aCBzZWdtZW50cyBhcmUgaW4gdGhlIHNhbWUgb3JkZXIgXG4gICAgICAvLyAobGVmdCB0byByaWdodCBvciByaWdodCB0byBsZWZ0KS5cbiAgICAgIGlmKHAxWzBdLnggPiBwMVsxXS54ICYmIHAyWzBdLnggPCBwMlswXS54KSBwMS5yZXZlcnNlKCk7XG4gICAgICAvLyB0aGVuIGRlbGVnYXRlIHRvIHBvaW50IGVxdWFsaXR5XG4gICAgICByZXR1cm4gZXF1YWwocDEsIHAyKVxuICAgIH1cbiAgICBpZiAobzEgaW5zdGFuY2VvZiBMaW5lICYmIG8yIGluc3RhbmNlb2YgTGluZSkge1xuICAgICAgcmV0dXJuIGVxdWFsKG8xLm0sIG8yLm0pICYmIGVxdWFsKG8xLnkoMCksIG8yLnkoMCkpICYmIGVxdWFsKG8xLngoMCksIG8yLngoMCkpO1xuICAgIH1cblxuICAgIC8vIGZhbGxiYWNrIHRvIG9iamVjdCBlcXVhbGl0eVxuICAgIHJldHVybiBvMSA9PT0gbzI7XG4gIH1cbn1cbiIsIlxubGV0IEdlb20gPSByZXF1aXJlKCcuL2dlb20nKSxcbiAgICBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKSxcbiAgICB7aW50ZXJzZWN0fSA9IHJlcXVpcmUoJy4uL2ludGVyc2VjdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cz1cbmNsYXNzIEludGVyc2VjdGlvbiBleHRlbmRzIFBvaW50IHtcbiAgXG4gIFxuICAvKiogIFxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0gey4uLkdlb219IG9iamVjdHMgdG8gYmUgaW50ZXJzZWN0ZWRcbiAgICogQHBhcmFtIHtudW1iZXJ8R2VvbX5ib29sZWFufSBbd2hpY2hdIG9wdGlvbmFsIGFycmF5IGluZGV4IG9yIGZpbHRlciBjYWxsYmFjayBpbiBjYXNlIHRoZXJlIGFyZSBtdWx0aXBsZSBpbnRlcnNlY3Rpb25zLlxuICAgKi8gICBcbiAgY29uc3RydWN0b3IobmFtZSwgLi4ub2JqZWN0cykge1xuICAgIGlmKG5hbWUgaW5zdGFuY2VvZiBHZW9tKSB7XG4gICAgICBvYmplY3RzLnNoaWZ0KG5hbWUpO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuICAgIHN1cGVyKG5hbWUsIG51bGwsIG51bGwpO1xuICAgIFxuICAgIHRoaXMud2hpY2ggPSAvZnVuY3Rpb258bnVtYmVyLy50ZXN0KHR5cGVvZiBvYmplY3RzW29iamVjdHMubGVuZ3RoIC0gMV0pID9cbiAgICAgIG9iamVjdHMucG9wKCkgOiAwO1xuICAgIHRoaXMub2JqZWN0cyA9IG9iamVjdHM7XG4gICAgdGhpcy5mcmVlID0gZmFsc2U7XG4gIH1cbiAgXG4gIHVwZGF0ZSgpIHtcbiAgICBsZXQgcmVzdWx0ID0gaW50ZXJzZWN0LmFwcGx5KG51bGwsIHRoaXMub2JqZWN0cyk7XG4gICAgaWYodHlwZW9mIHRoaXMud2hpY2ggPT09ICdmdW5jdGlvbicpXG4gICAgICByZXN1bHQgPSByZXN1bHQuZmlsdGVyKHRoaXMud2hpY2gpWzBdO1xuICAgIGVsc2VcbiAgICAgIHJlc3VsdCA9IHJlc3VsdFt0aGlzLndoaWNoXTtcbiAgICAgIFxuICAgIGlmKHJlc3VsdCkge1xuICAgICAgKHt4OiB0aGlzLngsIHk6IHRoaXMueX0gPSByZXN1bHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMueCA9IHRoaXMueSA9IG51bGw7XG4gICAgfVxuICB9XG4gIFxuICB0b1N0cmluZyh2ZXJib3NlKSB7XG4gICAgbGV0IHBzdHIgPSBzdXBlci50b1N0cmluZygpO1xuICAgIHJldHVybiAoIXZlcmJvc2UpID8gcHN0ciA6XG4gICAgcHN0ciArICc7IGludGVyc2VjdGlvbiBvZjogJyArIHRoaXMub2JqZWN0cy5tYXAobyA9PiBvLnRvU3RyaW5nKCkpLmpvaW4oJywnKTtcbiAgfVxufVxuIiwiXG5sZXQgR2VvbSA9IHJlcXVpcmUoJy4vZ2VvbScpO1xuXG5jbGFzcyBMaW5lIGV4dGVuZHMgR2VvbSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUsIHAxLCBwMikge1xuICAgIGlmKHR5cGVvZiBwMiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHAyID0gcDE7XG4gICAgICBwMSA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgXG4gICAgc3VwZXIobmFtZSk7XG4gICAgaWYgKCFwMikge1xuICAgICAgdGhpcy5fcCA9IHAxLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3AgPSBbcDEsIHAyXTtcbiAgICB9XG4gICAgXG4gICAgdGhpcy5fY2xpcCA9IGZhbHNlO1xuICAgIFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgIC8vIFRPRE86IEkgZG9uJ3QgbGlrZSBkeCBhbmQgZHkgb24gdGhlIGxpbmUgY2xhc3MuLi5cbiAgICAgIGR4OiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fcFsxXS54IC0gdGhpcy5fcFswXS54O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZHk6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl9wWzFdLnkgLSB0aGlzLl9wWzBdLnk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0aGV0YToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy5keSwgdGhpcy5keCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBtOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICBpZiAodGhpcy5keCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgZWxzZSByZXR1cm4gdGhpcy5keSAvIHRoaXMuZHg7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcbiAgICAgIGxlZnQ6IHtcbiAgICAgICAgZ2V0KCkgeyByZXR1cm4gdGhpcy5fY2xpcCA/IE1hdGgubWluKHRoaXMuX3BbMF0ueCwgdGhpcy5fcFsxXS54KSA6IG51bGw7IH1cbiAgICAgIH0sXG4gICAgICByaWdodDoge1xuICAgICAgICBnZXQoKSB7IHJldHVybiB0aGlzLl9jbGlwID8gTWF0aC5tYXgodGhpcy5fcFswXS54LCB0aGlzLl9wWzFdLngpIDogbnVsbDsgfVxuICAgICAgfSxcbiAgICAgIHRvcDoge1xuICAgICAgICBnZXQoKSB7IHJldHVybiB0aGlzLl9jbGlwID8gTWF0aC5taW4odGhpcy5fcFswXS55LCB0aGlzLl9wWzFdLnkpIDogbnVsbDsgfVxuICAgICAgfSxcbiAgICAgIGJvdHRvbToge1xuICAgICAgICBnZXQoKSB7IHJldHVybiB0aGlzLl9jbGlwID8gTWF0aC5tYXgodGhpcy5fcFswXS55LCB0aGlzLl9wWzFdLnkpIDogbnVsbDsgfVxuICAgICAgfVxuICAgICAgXG4gICAgfSlcbiAgfVxuICBcbiAgeSh4KSB7XG4gICAgaWYgKCh0aGlzLmR4ID09PSAwKSB8fCAodGhpcy5fY2xpcCAmJiAodGhpcy5sZWZ0ID4geCB8fCB0aGlzLnJpZ2h0IDwgeCkpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZWxzZSBcbiAgICAgIHJldHVybiB0aGlzLl9wWzBdLnkgKyAoeCAtIHRoaXMuX3BbMF0ueCkgKiAodGhpcy5keSkgLyAodGhpcy5keClcbiAgfVxuXG4gIHgoeSkge1xuICAgIGlmICgodGhpcy5keSA9PT0gMCkgfHwgKHRoaXMuX2NsaXAgJiYgKHRoaXMudG9wID4geSB8fCB0aGlzLmJvdHRvbSA8IHkpKSlcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGVsc2UgXG4gICAgICByZXR1cm4gdGhpcy5fcFswXS54ICsgKHkgLSB0aGlzLl9wWzBdLnkpICogKHRoaXMuZHgpIC8gKHRoaXMuZHkpXG4gIH1cbiAgXG4gIGNvbnRhaW5zKHApIHtcbiAgICBsZXQgb25MaW5lID0gKHRoaXMuZHggIT09IDApID8gKHRoaXMueShwLngpID09PSBwLnkpIDogKHRoaXMueChwLnkpID09PSBwLngpO1xuICAgIHJldHVybiBvbkxpbmUgJiYgKCF0aGlzLl9jbGlwIHx8IFxuICAgICAgKCh0aGlzLmxlZnQgPD0gcC54ICYmIHAueCA8PSB0aGlzLnJpZ2h0KSAmJlxuICAgICAgKHRoaXMudG9wIDw9IHAueSAmJiBwLnkgPD0gdGhpcy5ib3R0b20pKSk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJ0xpbmUnICsgc3VwZXIudG9TdHJpbmcoKSArICdbJyArXG4gICAgICB0aGlzLl9wWzBdLnRvU3RyaW5nKCkgKyAnOycgKyB0aGlzLl9wWzFdLnRvU3RyaW5nKCkgK1xuICAgICAgJ10nO1xuICB9XG59XG4gICAgICAgIFxubW9kdWxlLmV4cG9ydHMgPSBMaW5lO1xuIiwibGV0IEdlb20gPSByZXF1aXJlKCcuL2dlb20nKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFBvaW50IGV4dGVuZHMgR2VvbSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUsIHgsIHkpIHtcbiAgICBpZih0eXBlb2YgeSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHkgPSB4O1xuICAgICAgeCA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgc3VwZXIobmFtZSk7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuZnJlZSA9IHRydWU7XG4gIH1cbiAgXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBzdXBlci50b1N0cmluZygpICsgJygnICsgdGhpcy54ICsgJywnICsgdGhpcy55ICsgJyknO1xuICB9XG4gIFxuICAvKiBzaG9ydGhhbmQgZnVuY3Rpb24gZm9yIGNvbnN0cnVjdGluZyBhIHBvaW50IGZyb20gY29vZGluYXRlcyAqL1xuICBzdGF0aWMgUChuYW1lLCB4LCB5KSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChuYW1lLCB4LCB5KTtcbiAgfVxufVxuIiwibGV0IFAgPSByZXF1aXJlKCcuL3BvaW50JykuUCxcbiAgICBMaW5lID0gcmVxdWlyZSgnLi9saW5lJyksXG4gICAge2Rpc3RhbmNlU3F1YXJlZCwgZGlzdGFuY2V9ID0gcmVxdWlyZSgnLi4vY2FsYycpO1xuXG5jbGFzcyBTZWdtZW50IGV4dGVuZHMgTGluZSB7XG4gIGNvbnN0cnVjdG9yKG5hbWUsIHAxLCBwMikge1xuICAgIHN1cGVyKG5hbWUsIHAxLCBwMik7XG4gICAgdGhpcy5fY2xpcCA9IHRydWU7XG4gICAgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgcDoge1xuICAgICAgICAvLyBUT0RPOiBjbG9uZSBwb2ludCB0aGVtc2VsdmVzP1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh0aGlzLl9wKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgbGVuZ3Roc3E6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBkaXN0YW5jZVNxdWFyZWQodGhpcy5fcFswXSwgdGhpcy5fcFsxXSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcbiAgICAgIGxlbmd0aDoge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGRpc3RhbmNlKHRoaXMuX3BbMF0sIHRoaXMuX3BbMV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuICBcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdTZWdtZW50JyArIHN1cGVyLnRvU3RyaW5nKCk7XG4gIH1cbiAgXG4gIC8qXG4gIGNsaXAgdGhlIGdpdmVuIGxpbmUgKG9yIGxpbmUgc2VnbWVudCkgdG8gdGhlIGdpdmVuIGJvdW5kaW5nIGJveCwgd2hlcmUgYGJvdW5kc2BcbiAgbXVzdCBoYXZlIGBsZWZ0YCwgYHJpZ2h0YCwgYHRvcGAsIGFuZCBgYm90dG9tYCBwcm9wZXJ0aWVzLlxuICAqL1xuICBzdGF0aWMgY2xpcChib3VuZHMsIGxpbmUpIHtcbiAgICB2YXIgW3AxLCBwMl0gPSBsaW5lLl9wO1xuICAgIFxuICAgIHZhciBsZWZ0ID0gbGluZS55KGJvdW5kcy5sZWZ0KSxcbiAgICByaWdodCA9IGxpbmUueShib3VuZHMucmlnaHQpLFxuICAgIHRvcCA9IGxpbmUueChib3VuZHMudG9wKSxcbiAgICBib3R0b20gPSBsaW5lLngoYm91bmRzLmJvdHRvbSk7XG4gICAgXG4gICAgaWYgKHAxLnggPiBwMi54KSB7XG4gICAgICBsZXQgdCA9IHAxO1xuICAgICAgcDEgPSBwMjtcbiAgICAgIHAyID0gdDtcbiAgICB9XG4gICAgaWYgKGxlZnQgJiYgbGVmdCA+PSBib3VuZHMudG9wICYmIGxlZnQgPD0gYm91bmRzLmJvdHRvbSkge1xuICAgICAgLy8gaW50ZXJzZWN0cyBsZWZ0IHdhbGxcbiAgICAgIHAxID0gUChib3VuZHMubGVmdCwgbGVmdCk7XG4gICAgfVxuICAgIGlmIChyaWdodCAmJiByaWdodCA+PSBib3VuZHMudG9wICYmIHJpZ2h0IDw9IGJvdW5kcy5ib3R0b20pIHtcbiAgICAgIC8vIGludGVyc2VjdHMgcmlnaHQgd2FsbFxuICAgICAgcDIgPSBQKGJvdW5kcy5yaWdodCwgcmlnaHQpO1xuICAgIH1cbiAgICBcbiAgICBpZiAocDEueSA+IHAyLnkpIHtcbiAgICAgIGxldCB0ID0gcDE7XG4gICAgICBwMSA9IHAyO1xuICAgICAgcDIgPSB0O1xuICAgIH1cbiAgICBpZiAodG9wICYmIHRvcCA+PSBib3VuZHMubGVmdCAmJiB0b3AgPD0gYm91bmRzLnJpZ2h0KSB7XG4gICAgICAvLyBpbnRlcnNlY3RzIHRvcCB3YWxsXG4gICAgICBwMSA9IFAodG9wLCBib3VuZHMudG9wKTtcbiAgICB9XG4gICAgaWYgKGJvdHRvbSAmJiBib3R0b20gPj0gYm91bmRzLmxlZnQgJiYgYm90dG9tIDw9IGJvdW5kcy5yaWdodCkge1xuICAgICAgLy8gaW50ZXJzZWN0cyBib3R0b20gd2FsbFxuICAgICAgcDIgPSBQKGJvdHRvbSwgYm91bmRzLmJvdHRvbSk7XG4gICAgfVxuICAgIFxuICAgIGxldCBjbGlwcGVkID0gbmV3IFNlZ21lbnQobnVsbCwgcDEsIHAyKTtcbiAgICBjbGlwcGVkLnBhcmVudCA9IGxpbmU7XG4gICAgcmV0dXJuIGNsaXBwZWQ7XG4gIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlZ21lbnQ7XG4iLCJsZXQgcGFyc2VyID0gcmVxdWlyZSgnZXVjbGlkLXBhcnNlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNjZW5lLCB0ZXh0LCBjYikge1xuICBmdW5jdGlvbiBlcnJvcihpdGVtLCBtZXNzYWdlKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICBpZiAoaXRlbS5zb3VyY2UpIHtcbiAgICAgIGVyci5saW5lID0gaXRlbS5zb3VyY2UubGluZTtcbiAgICAgIGVyci5jb2x1bW4gPSBpdGVtLnNvdXJjZS5jb2x1bW47XG4gICAgICBlcnIudGV4dCA9IGl0ZW0uc291cmNlLnRleHQ7XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmUoc3RhY2ssIGl0ZW0pIHtcblxuICAgIGlmIChpdGVtLm5hbWUpIHtcbiAgICAgIGlmIChzY2VuZS5nZXQoaXRlbS5uYW1lKSkge1xuICAgICAgICByZXR1cm4gaXRlbS5uYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IoaXRlbSwgXCJDb3VsZCBub3QgZmluZCBcIiArIGl0ZW0ubmFtZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdGFjay5pbmRleE9mKGl0ZW0pID49IDApIHtcbiAgICAgICAgZXJyb3IoaXRlbSwgXCJDaXJjdWxhciByZWZlcmVuY2UhXCIpO1xuICAgICAgfVxuICAgICAgc3RhY2sucHVzaChpdGVtKTtcbiAgICAgIHJldHVybiBwYXJzZShzdGFjaywgaXRlbSk7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZShzdGFjaywgaXRlbSkge1xuICAgIHN3aXRjaCAoaXRlbS50eXBlKSB7XG4gICAgICBjYXNlICdncm91cCc6XG4gICAgICAgIHNjZW5lLmdyb3VwKGl0ZW0ubmFtZSk7XG4gICAgICAgIHJldHVybiBpdGVtLm5hbWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncG9pbnQnOlxuICAgICAgICBzY2VuZS5wb2ludChpdGVtLm5hbWUsIGl0ZW0ueCwgaXRlbS55KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdsaW5lJzpcbiAgICAgICAgc2NlbmUubGluZShpdGVtLm5hbWUsIHJlc29sdmUoc3RhY2ssIGl0ZW0ucG9pbnRzWzBdKSwgcmVzb2x2ZShzdGFjaywgaXRlbS5wb2ludHNbMV0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzZWdtZW50JzpcbiAgICAgICAgc2NlbmUuc2VnbWVudChpdGVtLm5hbWUsIHJlc29sdmUoc3RhY2ssIGl0ZW0ucG9pbnRzWzBdKSwgcmVzb2x2ZShzdGFjaywgaXRlbS5wb2ludHNbMV0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjaXJjbGUnOlxuICAgICAgICBzY2VuZS5jaXJjbGUoaXRlbS5uYW1lLCByZXNvbHZlKHN0YWNrLCBpdGVtLmNlbnRlciksIHJlc29sdmUoc3RhY2ssIGl0ZW0uYm91bmRhcnlQb2ludCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2ludGVyc2VjdGlvbic6XG4gICAgICAgIGxldCB3aGljaCA9IDA7XG4gICAgICAgIGlmIChpdGVtLndoaWNoICYmIGl0ZW0ud2hpY2gub3AgPT09ICdub3QnKVxuICAgICAgICAgIHdoaWNoID0gc2NlbmUuaXNudChpdGVtLndoaWNoLmFyZ3NbMF0pO1xuICAgICAgICAgIFxuICAgICAgICBzY2VuZS5pbnRlcnNlY3Rpb24oaXRlbS5uYW1lLFxuICAgICAgICAgIHJlc29sdmUoc3RhY2ssIGl0ZW0ub2JqZWN0c1swXSksIFxuICAgICAgICAgIHJlc29sdmUoc3RhY2ssIGl0ZW0ub2JqZWN0c1sxXSksIHdoaWNoKVxuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gc2NlbmUubGFzdCgpLm5hbWU7XG4gIH1cblxuICBsZXQgcGFyc2VkT2JqZWN0cyA9IFtdLFxuICAgIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cbiAgdHJ5IHtcbiAgICAvKiBwYXJzZSBcIltncm91cGluZ11cIiBzdGF0ZW1lbnRzIGRpcmVjdGx5LCBhbmQgZ2VvbWV0cnkgZGVjbGFyYXRpb25zIHVzaW5nXG4gICAgICogdGhlIGV1Y2xpZC1wYXJzZXIgcGFyc2VyLiAqL1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxpbmVzW2ldID0gbGluZXNbaV0udHJpbSgpO1xuICAgICAgaWYgKC9eXFxbLipcXF0kLy50ZXN0KGxpbmVzW2ldKSlcbiAgICAgICAgcGFyc2VkT2JqZWN0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnZ3JvdXAnLFxuICAgICAgICAgIG5hbWU6IGxpbmVzW2ldLnNsaWNlKDEsIC0xKVxuICAgICAgICB9KTtcbiAgICAgIGVsc2UgaWYgKGxpbmVzW2ldLmxlbmd0aCA+IDApXG4gICAgICAgIHBhcnNlZE9iamVjdHMucHVzaChwYXJzZXIucGFyc2UobGluZXNbaV0pWzBdKTtcbiAgICB9XG5cbiAgICAvKiByZW1vdmUgZnJvbSBzY2VuZSBhbnkgZXhpc3Rpbmcgb2JqZWN0cyB0aGF0IHdlcmVuJ3QgZGVjbGFyZWQgaW4gdGhlIHBhcnNlZCB0ZXh0ICovXG4gICAgbGV0IHBhcnNlZE5hbWVzID0gcGFyc2VkT2JqZWN0cy5tYXAobyA9PiBvLm5hbWUpO1xuICAgIHNjZW5lLl9vYmplY3RzLmtleXMoKVxuICAgICAgLmZpbHRlcihuYW1lID0+IHBhcnNlZE5hbWVzLmluZGV4T2YobmFtZSkgPCAwKVxuICAgICAgLmZvckVhY2gobmFtZSA9PiBzY2VuZS5fb2JqZWN0cy5yZW1vdmUobmFtZSkpO1xuXG4gICAgLyogbm93IGhhbmRsZSB0aGUgYWN0dWFsIHBhcnNlZCBvYmplY3RzICovXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRPYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwYXJzZShbXSwgcGFyc2VkT2JqZWN0c1tpXSk7XG4gICAgfVxuXG4gICAgaWYgKGNiKSBjYih0cnVlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgaWYgKGNiKSBjYihudWxsLCBlKTtcbiAgfVxufVxuIiwiXG5sZXQgZDMgPSByZXF1aXJlKCdkMycpXG5sZXQgeyBQb2ludCwgQ2lyY2xlLCBTZWdtZW50LCBMaW5lIH0gPSByZXF1aXJlKCcuL21vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXJlcjtcblxuZnVuY3Rpb24gcmVuZGVyZXIoc2NlbmUsIHN2Z0VsZW1lbnQpIHtcbiAgbGV0IHN2ZyA9IGQzLnNlbGVjdChzdmdFbGVtZW50KTtcblxuICBmdW5jdGlvbiBwb2ludCgpIHtcbiAgICB0aGlzLmF0dHIoJ2NsYXNzJywga2xhc3NlcygncG9pbnQnKSApXG4gICAgLmF0dHIoJ2N4JywgZD0+ZC54KVxuICAgIC5hdHRyKCdjeScsIGQ9PmQueSlcbiAgICAuYXR0cigncicsIGQ9PjUpXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGtsYXNzZXMoKSB7XG4gICAgbGV0IGluaXQgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIHJldHVybiBkID0+IGluaXQuY29uY2F0KGQuY2xhc3NlcyA/IGQuY2xhc3Nlcy52YWx1ZXMoKSA6IFtdKS5qb2luKCcgJyk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAvKiBjaXJjbGVzICovXG4gICAgbGV0IGNpcmNsZXMgPSBzdmcuc2VsZWN0QWxsKCdnLmNpcmNsZScpXG4gICAgLmRhdGEoc2NlbmUub2JqZWN0cygpLmZpbHRlcihkID0+IGQgaW5zdGFuY2VvZiBDaXJjbGUpKTtcblxuICAgIGxldCBjaXJjbGVHcm91cCA9IGNpcmNsZXMuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2NpcmNsZScpKVxuICAgIC5jYWxsKGhvdmVyKTtcbiAgICBjaXJjbGVHcm91cC5hcHBlbmQoJ2NpcmNsZScpLmF0dHIoJ2NsYXNzJywgJ2hhbmRsZScpO1xuICAgIGNpcmNsZUdyb3VwLmFwcGVuZCgnY2lyY2xlJykuYXR0cignY2xhc3MnLCAndmlzaWJsZScpO1xuXG4gICAgY2lyY2xlc1xuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2NpcmNsZScpKVxuICAgIC5zZWxlY3RBbGwoJ2NpcmNsZScpXG4gICAgLmF0dHIoJ2N4JywgZCA9PiBkLmNlbnRlci54KVxuICAgIC5hdHRyKCdjeScsIGQgPT4gZC5jZW50ZXIueSlcbiAgICAuYXR0cigncicsIGQgPT4gZC5yYWRpdXMpXG4gICAgXG4gICAgY2lyY2xlcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgXG4gICAgLyogbGluZXMgKi9cbiAgICBsZXQgbGluZXMgPSBzdmcuc2VsZWN0QWxsKCdnLmxpbmUnKVxuICAgIC5kYXRhKHNjZW5lLm9iamVjdHMoKS5maWx0ZXIoZD0+ZCBpbnN0YW5jZW9mIExpbmUpKTtcbiAgICBcbiAgICBsZXQgbGluZUdyb3VwID0gbGluZXMuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2xpbmUnKSlcbiAgICAuY2FsbChob3Zlcik7XG4gICAgbGluZUdyb3VwLmZpbHRlcihkPT5kIGluc3RhbmNlb2YgU2VnbWVudClcbiAgICAuYXR0cignY2xhc3MnLCBrbGFzc2VzKCdsaW5lJywgJ3NlZ21lbnQnKSlcbiAgICBsaW5lR3JvdXAuYXBwZW5kKCdsaW5lJykuYXR0cignY2xhc3MnLCAnaGFuZGxlJyk7XG4gICAgbGluZUdyb3VwLmFwcGVuZCgnbGluZScpLmF0dHIoJ2NsYXNzJywgJ3Zpc2libGUnKTtcbiAgICBcbiAgICAvLyBUT0RPOiB0aGlzIGlzIGdyb3NzbHkgaW5lZmZpY2llbnRcbiAgICBmdW5jdGlvbiBlbmRwb2ludChpbmRleCwgY29vcmQpIHtcbiAgICAgIHJldHVybiBkPT57XG4gICAgICAgIGxldCBzID0gZCBpbnN0YW5jZW9mIFNlZ21lbnQgPyBkIDogU2VnbWVudC5jbGlwKHNjZW5lLmJvdW5kcywgZCk7XG4gICAgICAgIHJldHVybiBzLnBbaW5kZXhdW2Nvb3JkXTtcbiAgICAgIH1cbiAgICB9XG4gICAgICBcbiAgICBsaW5lc1xuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2xpbmUnKSlcbiAgICAuc2VsZWN0QWxsKCdsaW5lJylcbiAgICAuYXR0cigneDEnLCBlbmRwb2ludCgwLCd4JykpXG4gICAgLmF0dHIoJ3kxJywgZW5kcG9pbnQoMCwneScpKVxuICAgIC5hdHRyKCd4MicsIGVuZHBvaW50KDEsJ3gnKSlcbiAgICAuYXR0cigneTInLCBlbmRwb2ludCgxLCd5JykpXG4gICAgXG4gICAgbGluZXMuZXhpdCgpLnJlbW92ZSgpO1xuICAgIFxuICAgIC8qIHBvaW50cyAqL1xuICAgIGxldCBwb2ludHMgPSBzdmcuc2VsZWN0QWxsKCdjaXJjbGUucG9pbnQnKVxuICAgIC5kYXRhKHNjZW5lLm9iamVjdHMoKS5maWx0ZXIoZD0+ZCBpbnN0YW5jZW9mIFBvaW50KSlcbiAgICAuc29ydCgoYSxiKT0+KGEuZnJlZSA/IDEgOiAwKSAtIChiLmZyZWUgPyAxIDogMCkpXG4gICAgcG9pbnRzLmVudGVyKCkuYXBwZW5kKCdjaXJjbGUnKVxuICAgIHBvaW50cy5jYWxsKHBvaW50KVxuICAgIC5jYWxsKGhvdmVyKTtcbiAgICBcbiAgICBwb2ludHMuZXhpdCgpLnJlbW92ZSgpO1xuICAgIFxuXG4gICAgLyogYXR0YWNoIFwiYWN0aXZlXCIgY2xhc3Mgb24gaG92ZXIgKi9cbiAgICBmdW5jdGlvbiBtb3VzZW92ZXIoKSB7IGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdhY3RpdmUnLCB0cnVlKTsgfVxuICAgIGZ1bmN0aW9uIG1vdXNlb3V0KCkgeyBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnYWN0aXZlJywgZmFsc2UpOyB9XG4gICAgZnVuY3Rpb24gaG92ZXIoKSB7XG4gICAgICB0aGlzLm9uKCdtb3VzZW92ZXInLCBtb3VzZW92ZXIpLm9uKCdtb3VzZW91dCcsIG1vdXNlb3V0KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gICAgXG4gIH1cblxuICByZXR1cm4gcmVuZGVyO1xufVxuIiwiXG5sZXQgZDMgPSByZXF1aXJlKCdkMycpLCAvLyBUT0RPOiByZW1vdmUgZGVwOyBvbmx5IGJlaW5nIHVzZWQgZm9yIGQzLm1hcCgpIGFuZCBkMy5zZXQoKS5cbiAgICB7XG4gICAgICBQb2ludCxcbiAgICAgIExpbmUsXG4gICAgICBTZWdtZW50LFxuICAgICAgQ2lyY2xlLFxuICAgICAgZXF1YWxXaXRoaW5cbiAgICB9ID0gcmVxdWlyZSgnLi9tb2RlbCcpLFxuICAgIEludGVyc2VjdGlvbiA9IHJlcXVpcmUoJy4vbW9kZWwvaW50ZXJzZWN0aW9uJyk7XG5cblxuZnVuY3Rpb24gYWRkQ2xhc3Mob2JqLCBrbGFzcykge1xuICBvYmouY2xhc3NlcyA9IG9iai5jbGFzc2VzIHx8IGQzLnNldCgpO1xuICBvYmouY2xhc3Nlcy5hZGQoa2xhc3MpO1xufVxuXG5jbGFzcyBTY2VuZSB7XG4gIFxuICBjb25zdHJ1Y3Rvcihib3VuZHMpIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmJvdW5kcy53aWR0aCA9IHRoaXMuYm91bmRzLnJpZ2h0IC0gdGhpcy5ib3VuZHMubGVmdDtcbiAgICB0aGlzLmJvdW5kcy5oZWlnaHQgPSB0aGlzLmJvdW5kcy5ib3R0b20gLSB0aGlzLmJvdW5kcy50b3A7XG5cbiAgICB0aGlzLl9sYXN0ID0gbnVsbDsgLy8gaGFjayAtLSBzaG91bGQgYmUga2VlcGluZyBvYmplY3RzIGluIG9yZGVyZWQgc3RydWN0dXJlIGFueXdheS5cbiAgICB0aGlzLl9vYmplY3RzID0gZDMubWFwKCk7XG4gICAgdGhpcy5lcXVhbCA9IGVxdWFsV2l0aGluKE1hdGguc3FydCgyKSk7XG4gICAgdGhpcy5sb2cgPSBbXTtcbiAgfVxuICBcbiAgLyogcmV0dXJuIGFuIGFycmF5IG9mIGFsbCBQb2ludHMgaW4gdGhlIHNjZW5lICovXG4gIHBvaW50cygpIHtcbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKS5maWx0ZXIobyA9PiBvIGluc3RhbmNlb2YgUG9pbnQpXG4gIH1cbiAgXG4gIC8qIHJldHVybiBhbiBhcnJheSBvZiBhbGwgb2JqZWN0cyBpbiB0aGUgc2NlbmUgKi9cbiAgb2JqZWN0cygpIHtcbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKTtcbiAgfVxuICBcbiAgLyogZmluZCB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGluIHRoZSBzY2VuZSB1c2luZyBnZW9tZXRyaWNcbiAgKGkuZS4gZGVlcCkgZXF1YWxpdHkgcmF0aGVyIHRoYW4gcmVmZXJlbmNlID09PS4gKi9cbiAgZmluZChvYmopIHtcbiAgICBsZXQgb2JqZWN0cyA9IHRoaXMuX29iamVjdHMudmFsdWVzKCk7XG4gICAgZm9yKGxldCBpID0gMDsgaSA8IG9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHRoaXMuZXF1YWwob2JqZWN0c1tpXSwgb2JqKSkgcmV0dXJuIG9iamVjdHNbaV07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICAvKiogIFxuICAgKiBpcyAtIEdldCBhbiBlcXVhbGl0eS10ZXN0aW5nIGNhbGxiYWNrIGZvciB0aGUgZ2l2ZW4gb2JqZWN0LiAgXG4gICAqICAgIFxuICAgKiBAcGFyYW0gIHtHZW9tfHN0cmluZ30gb2JqIEVpdGhlciB0aGUgbmFtZSBvZiB0aGUgb2JqZWN0IHRvIHRlc3Qgb3IgdGhlIG9iamVjdCBpdHNlbGYuXG4gICAqIEByZXR1cm4ge0dlb21+Ym9vbGVhbn0gYSBmdW5jdGlvbiB0aGF0IHRlc3RzIHdoZXRoZXIgaXRzIGFyZ3VtZW50IGlzIGdlb21ldHJpY2FsbHkgZXF1YWwgdG8gb2JqLlxuICAgKi8gICBcbiAgaXMob2JqKSB7XG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHsgb2JqID0gdGhpcy5nZXQob2JqKTsgfVxuICAgIHJldHVybiAoc2Vjb25kT2JqKSA9PiAob2JqICYmIHRoaXMuZXF1YWwob2JqLCBzZWNvbmRPYmopKTtcbiAgfVxuICBcbiAgLyoqICBcbiAgKiBpcyAtIEdldCBhbiBOT04tZXF1YWxpdHktdGVzdGluZyBjYWxsYmFjayBmb3IgdGhlIGdpdmVuIG9iamVjdC4gIFxuICAqICAgIFxuICAqIEBwYXJhbSAge0dlb218c3RyaW5nfSBvYmogRWl0aGVyIHRoZSBuYW1lIG9mIHRoZSBvYmplY3QgdG8gdGVzdCBvciB0aGUgb2JqZWN0IGl0c2VsZi5cbiAgKiBAcmV0dXJuIHtHZW9tfmJvb2xlYW59IGEgZnVuY3Rpb24gdGhhdCB0ZXN0cyB3aGV0aGVyIGl0cyBhcmd1bWVudCBpcyBOT1QgZ2VvbWV0cmljYWxseSBlcXVhbCB0byBvYmouXG4gICovICAgXG4gIGlzbnQob2JqKSB7XG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHsgb2JqID0gdGhpcy5nZXQob2JqKTsgfVxuICAgIHJldHVybiAoc2Vjb25kT2JqKSA9PiAob2JqICYmICF0aGlzLmVxdWFsKG9iaiwgc2Vjb25kT2JqKSk7XG4gIH1cbiAgXG4gIGxhc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xhc3Q7XG4gIH1cbiAgXG4gIGdldChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX29iamVjdHMuZ2V0KG5hbWUpO1xuICB9XG4gIFxuICBwb2ludChuYW1lLCB4LCB5KSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBQb2ludChuYW1lLCB4LCB5KSk7XG4gIH1cbiAgXG4gIGNpcmNsZShuYW1lLCBjZW50ZXJJZCwgYm91bmRhcnlJZCkge1xuICAgIHJldHVybiB0aGlzLmFkZChuZXcgQ2lyY2xlKG5hbWUsIHRoaXMuZ2V0KGNlbnRlcklkKSwgdGhpcy5nZXQoYm91bmRhcnlJZCkpKTtcbiAgfVxuICBcbiAgc2VnbWVudChuYW1lLCBpZDEsIGlkMikge1xuICAgIHJldHVybiB0aGlzLmFkZChuZXcgU2VnbWVudChuYW1lLCB0aGlzLmdldChpZDEpLCB0aGlzLmdldChpZDIpKSk7XG4gIH1cbiAgXG4gIGxpbmUobmFtZSwgaWQxLCBpZDIpIHtcbiAgICByZXR1cm4gdGhpcy5hZGQobmV3IExpbmUobmFtZSwgdGhpcy5nZXQoaWQxKSwgdGhpcy5nZXQoaWQyKSkpO1xuICB9XG4gIFxuICBpbnRlcnNlY3Rpb24obmFtZSwgaWQxLCBpZDIsIHdoaWNoKSB7XG4gICAgbGV0IG8xID0gdGhpcy5nZXQoaWQxKSxcbiAgICAgICAgbzIgPSB0aGlzLmdldChpZDIpO1xuICAgIGlmKCFvMSkgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZmluZCBvYmplY3QgXCIraWQxKTtcbiAgICBpZighbzIpIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGZpbmQgb2JqZWN0IFwiK2lkMik7XG5cbiAgICByZXR1cm4gdGhpcy5hZGQobmV3IEludGVyc2VjdGlvbihuYW1lLCBvMSwgbzIsIHdoaWNoKSk7XG4gIH1cbiAgXG4gIGdyb3VwKHRhZykge1xuICAgIHRoaXMuX2N1cnJlbnRUYWcgPSB0YWc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGFkZChvYmplY3QpIHtcbiAgICAvLyBpZiB3ZSBhbHJlYWR5IGhhdmUgdGhpcyBvYmplY3QsIGFuZCBpdCdzIHRoZSBzYW1lIHR5cGUsIHRoZW4gdXBkYXRlIHRoZVxuICAgIC8vIGV4aXN0aW5nIG9uZSBpbiBwbGFjZS5cbiAgICBsZXQgZXhpc3RpbmcgPSB0aGlzLl9vYmplY3RzLmdldChvYmplY3QubmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nICYmIChleGlzdGluZy5jb25zdHJ1Y3Rvci5uYW1lID09PSBvYmplY3QuY29uc3RydWN0b3IubmFtZSkpIHtcbiAgICAgIGZvcihsZXQgcHJvcCBpbiBvYmplY3QpIGV4aXN0aW5nW3Byb3BdID0gb2JqZWN0W3Byb3BdO1xuICAgICAgb2JqZWN0ID0gZXhpc3Rpbmc7XG4gICAgfVxuICAgIC8vIGlmIGFuIG9iamVjdCBvZiB0aGUgc2FtZSBuYW1lIGJ1dCBkaWZmZXJlbnQgdHlwZSBvciBhbiBvYmplY3QgdGhhdCBpc1xuICAgIC8vIGdlb21ldHJpY2FsbHkgZXF1aXZhbGVudCBhbHJlYWR5IGV4aXN0cyBpbiB0aGUgc2NlbmUsIGRvIG5vdGhpbmcuXG4gICAgZWxzZSBpZihleGlzdGluZyB8fCAoZXhpc3RpbmcgPSB0aGlzLmZpbmQob2JqZWN0KSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdUcmllZCB0byBhZGQgJytvYmplY3QrJyBidXQgJytleGlzdGluZysnIGlzIGFscmVhZHkgaW4gc2NlbmUuJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLy8gYWRkIGEgbmV3IG9iamVjdCB0byB0aGUgc2NlbmUuXG4gICAgZWxzZSB7XG4gICAgICBvYmplY3QubmFtZSA9IG9iamVjdC5uYW1lIHx8IHRoaXMuZnJlZU5hbWUoKTtcbiAgICAgIHRoaXMuX29iamVjdHMuc2V0KG9iamVjdC5uYW1lLCBvYmplY3QpO1xuICAgIH1cbiAgICBcbiAgICBpZiAodGhpcy5fY3VycmVudFRhZykgYWRkQ2xhc3Mob2JqZWN0LCB0aGlzLl9jdXJyZW50VGFnKTtcbiAgICBpZiAob2JqZWN0LmZyZWUpIGFkZENsYXNzKG9iamVjdCwgJ2ZyZWUtcG9pbnQnKTtcbiAgICBcbiAgICB0aGlzLnVwZGF0ZShvYmplY3QpO1xuICAgIFxuICAgIHRoaXMuX2xhc3QgPSBvYmplY3Q7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGZyZWVOYW1lKCkge1xuICAgIGxldCBrZXlzID0gdGhpcy5fb2JqZWN0cy5rZXlzKCksXG4gICAgaWQgPSAwO1xuICAgIGZvcig7a2V5cy5pbmRleE9mKCdvYmplY3QnK2lkKSA+PSAwOyBpZCsrKTtcbiAgICByZXR1cm4gJ29iamVjdCcraWQ7XG4gIH1cbiAgXG4gIC8qKiAgXG4gICAqIHVwZGF0ZSAtIFVwZGF0ZSBvYmplY3RzIHRvIHJlZmxlY3QgY2hhbmdlcyBpbiBkZXBlbmRlbnQgb2JqZWN0cy4gKEUuZy4sXG4gICAqIHVwZGF0ZSBJbnRlcnNlY3Rpb24gY29vcmRpbmF0ZXMgd2hlbiB0aGUgaW50ZXJzZWN0ZWQgb2JqZWN0cyBoYXZlIGNoYW5nZWQuKVxuICAgKiAgICBcbiAgICogQHBhcmFtIHtHZW9tfSByb290IFRoZSBvYmplY3QgZnJvbSB3aGljaCB0byBzdGFydCB3YWxraW5nIHRoZSBkZXBlbmRlbmN5IGdyYXBoLiAgXG4gICAqL1xuICAvLyBUT0RPOiByZXNwZWN0IGByb290YCBwYXJhbWV0ZXIsIGFuZCBkbyBhbiBhY3R1YWwgREFHIHdhbGsuXG4gIHVwZGF0ZShyb290KSB7XG4gICAgdGhpcy5fb2JqZWN0cy52YWx1ZXMoKVxuICAgICAgLmZpbHRlcihvYmogPT4gb2JqIGluc3RhbmNlb2YgSW50ZXJzZWN0aW9uKVxuICAgICAgLmZvckVhY2gob2JqID0+IG9iai51cGRhdGUoKSlcbiAgfVxuICBcbiAgbG9nU3RhdGUobGFiZWwpIHtcbiAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgbGV0IG9iamVjdHMgPSB0aGlzLl9vYmplY3RzLnZhbHVlcygpO1xuICAgIGxldCBwb2ludHMgPSB0aGlzLnBvaW50cygpO1xuXG4gICAgbGV0IHN0YXRlID0ge1xuICAgICAgbGFiZWwsXG4gICAgICB0aW1lOiAobmV3IERhdGUoKSkudG9TdHJpbmcoKSxcbiAgICAgIG9iamVjdHM6IG9iamVjdHMubWFwKG8gPT4gby50b1N0cmluZygpKSxcbiAgICB9XG4gICAgdGhpcy5sb2cucHVzaChzdGF0ZSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTY2VuZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xuICAvKlxuICAgKiBHZW5lcmF0ZWQgYnkgUEVHLmpzIDAuOC4wLlxuICAgKlxuICAgKiBodHRwOi8vcGVnanMubWFqZGEuY3ovXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHBlZyRzdWJjbGFzcyhjaGlsZCwgcGFyZW50KSB7XG4gICAgZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9XG4gICAgY3Rvci5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBjdG9yKCk7XG4gIH1cblxuICBmdW5jdGlvbiBTeW50YXhFcnJvcihtZXNzYWdlLCBleHBlY3RlZCwgZm91bmQsIG9mZnNldCwgbGluZSwgY29sdW1uKSB7XG4gICAgdGhpcy5tZXNzYWdlICA9IG1lc3NhZ2U7XG4gICAgdGhpcy5leHBlY3RlZCA9IGV4cGVjdGVkO1xuICAgIHRoaXMuZm91bmQgICAgPSBmb3VuZDtcbiAgICB0aGlzLm9mZnNldCAgID0gb2Zmc2V0O1xuICAgIHRoaXMubGluZSAgICAgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uICAgPSBjb2x1bW47XG5cbiAgICB0aGlzLm5hbWUgICAgID0gXCJTeW50YXhFcnJvclwiO1xuICB9XG5cbiAgcGVnJHN1YmNsYXNzKFN5bnRheEVycm9yLCBFcnJvcik7XG5cbiAgZnVuY3Rpb24gcGFyc2UoaW5wdXQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDoge30sXG5cbiAgICAgICAgcGVnJEZBSUxFRCA9IHt9LFxuXG4gICAgICAgIHBlZyRzdGFydFJ1bGVGdW5jdGlvbnMgPSB7IHN0YXJ0OiBwZWckcGFyc2VzdGFydCB9LFxuICAgICAgICBwZWckc3RhcnRSdWxlRnVuY3Rpb24gID0gcGVnJHBhcnNlc3RhcnQsXG5cbiAgICAgICAgcGVnJGMwID0gcGVnJEZBSUxFRCxcbiAgICAgICAgcGVnJGMxID0gW10sXG4gICAgICAgIHBlZyRjMiA9IC9eW1xcbiBdLyxcbiAgICAgICAgcGVnJGMzID0geyB0eXBlOiBcImNsYXNzXCIsIHZhbHVlOiBcIltcXFxcbiBdXCIsIGRlc2NyaXB0aW9uOiBcIltcXFxcbiBdXCIgfSxcbiAgICAgICAgcGVnJGM0ID0gZnVuY3Rpb24ocikgeyByZXR1cm4gcjsgfSxcbiAgICAgICAgcGVnJGM1ID0gZnVuY3Rpb24oZCkge3JldHVybiBkO30sXG4gICAgICAgIHBlZyRjNiA9IGZ1bmN0aW9uKGhlYWQsIHRhaWwpIHsgcmV0dXJuIFtoZWFkXS5jb25jYXQodGFpbCkgfSxcbiAgICAgICAgcGVnJGM3ID0gbnVsbCxcbiAgICAgICAgcGVnJGM4ID0gXCJsZXRcIixcbiAgICAgICAgcGVnJGM5ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibGV0XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJsZXRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMCA9IFwiYmVcIixcbiAgICAgICAgcGVnJGMxMSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImJlXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJiZVxcXCJcIiB9LFxuICAgICAgICBwZWckYzEyID0gXCJlcXVhbFwiLFxuICAgICAgICBwZWckYzEzID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiZXF1YWxcIiwgZGVzY3JpcHRpb246IFwiXFxcImVxdWFsXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTQgPSBcIj1cIixcbiAgICAgICAgcGVnJGMxNSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIj1cIiwgZGVzY3JpcHRpb246IFwiXFxcIj1cXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxNiA9IC9eWyBdLyxcbiAgICAgICAgcGVnJGMxNyA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbIF1cIiwgZGVzY3JpcHRpb246IFwiWyBdXCIgfSxcbiAgICAgICAgcGVnJGMxOCA9IFwiLlwiLFxuICAgICAgICBwZWckYzE5ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiLlwiLCBkZXNjcmlwdGlvbjogXCJcXFwiLlxcXCJcIiB9LFxuICAgICAgICBwZWckYzIwID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7IHJldHVybiBuYW1lZChvYmosIG5hbWUpIH0sXG4gICAgICAgIHBlZyRjMjEgPSBcImRyYXdcIixcbiAgICAgICAgcGVnJGMyMiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImRyYXdcIiwgZGVzY3JpcHRpb246IFwiXFxcImRyYXdcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMyMyA9IGZ1bmN0aW9uKG5hbWUpIHtyZXR1cm4gbmFtZTt9LFxuICAgICAgICBwZWckYzI0ID0gZnVuY3Rpb24ob2JqLCBuYW1lKSB7IHJldHVybiBuYW1lZChvYmosIG5hbWUpIH0sXG4gICAgICAgIHBlZyRjMjUgPSBcIiNcIixcbiAgICAgICAgcGVnJGMyNiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIiNcIiwgZGVzY3JpcHRpb246IFwiXFxcIiNcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMyNyA9IC9eW15cXG5dLyxcbiAgICAgICAgcGVnJGMyOCA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbXlxcXFxuXVwiLCBkZXNjcmlwdGlvbjogXCJbXlxcXFxuXVwiIH0sXG4gICAgICAgIHBlZyRjMjkgPSBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHt0eXBlOiAnY29tbWVudCcsIHZhbHVlOiB2YWx9IH0sXG4gICAgICAgIHBlZyRjMzAgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwidGhlIG5hbWUgb2YgYSBwb2ludFwiIH0sXG4gICAgICAgIHBlZyRjMzEgPSBcInBvaW50XCIsXG4gICAgICAgIHBlZyRjMzIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJwb2ludFwiLCBkZXNjcmlwdGlvbjogXCJcXFwicG9pbnRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzMyA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIHt0eXBlOiAncG9pbnQnLCBuYW1lOm5hbWV9IH0sXG4gICAgICAgIHBlZyRjMzQgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwiKHgseSlcIiB9LFxuICAgICAgICBwZWckYzM1ID0gXCIoXCIsXG4gICAgICAgIHBlZyRjMzYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIoXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIoXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMzcgPSBcIixcIixcbiAgICAgICAgcGVnJGMzOCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIixcIiwgZGVzY3JpcHRpb246IFwiXFxcIixcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzOSA9IFwiKVwiLFxuICAgICAgICBwZWckYzQwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiKVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiKVxcXCJcIiB9LFxuICAgICAgICBwZWckYzQxID0gZnVuY3Rpb24oeCwgeSkgeyByZXR1cm4gbyh7dHlwZTogJ3BvaW50Jyx4OiB4LHk6IHl9KSB9LFxuICAgICAgICBwZWckYzQyID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcIm5hbWUgb2YgYSBjaXJjbGVcIiB9LFxuICAgICAgICBwZWckYzQzID0gXCJjaXJjbGVcIixcbiAgICAgICAgcGVnJGM0NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImNpcmNsZVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiY2lyY2xlXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNDUgPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiB7dHlwZTogJ2NpcmNsZScsIG5hbWU6IG5hbWV9IH0sXG4gICAgICAgIHBlZyRjNDYgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwiY2lyY2xlIGRlZmluaXRpb25cIiB9LFxuICAgICAgICBwZWckYzQ3ID0gXCJhbmRcIixcbiAgICAgICAgcGVnJGM0OCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImFuZFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYW5kXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNDkgPSBmdW5jdGlvbihjMSwgYzIpIHtcbiAgICAgICAgICBpZihjMS50eXBlID09PSBjMi50eXBlKSB7IGV4cGVjdGVkKCdhIGNlbnRlciBhbmQgYSBwb2ludCBjb250YWluZWQgYnkgdGhlIGNpcmNsZScpIH1cbiAgICAgICAgICB2YXIgcmV0ID0gbyh7dHlwZTogJ2NpcmNsZSd9KTtcbiAgICAgICAgICByZXRbYzEudHlwZV0gPSBjMS5wb2ludDtcbiAgICAgICAgICByZXRbYzIudHlwZV0gPSBjMi5wb2ludDtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9LFxuICAgICAgICBwZWckYzUwID0gZnVuY3Rpb24oY2VudGVyKSB7IHJldHVybiB7dHlwZTogJ2NlbnRlcicsIHBvaW50OiBjZW50ZXJ9IH0sXG4gICAgICAgIHBlZyRjNTEgPSBmdW5jdGlvbihwb2ludCkgeyByZXR1cm4ge3R5cGU6ICdib3VuZGFyeVBvaW50JywgcG9pbnQ6IHBvaW50IH0gfSxcbiAgICAgICAgcGVnJGM1MiA9IHsgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogXCJ0aGUgbmFtZSBvZiBhIGxpbmUgb3Igc2VnbWVudFwiIH0sXG4gICAgICAgIHBlZyRjNTMgPSBcIi1cIixcbiAgICAgICAgcGVnJGM1NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIi1cIiwgZGVzY3JpcHRpb246IFwiXFxcIi1cXFwiXCIgfSxcbiAgICAgICAgcGVnJGM1NSA9IGZ1bmN0aW9uKHR5cGUsIHAxLCBwMikgeyByZXR1cm4ge3R5cGU6ICdsaW5lJywgcG9pbnRzOiBbcDEsIHAyXX0gfSxcbiAgICAgICAgcGVnJGM1NiA9IGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHsgcmV0dXJuIHt0eXBlOiB0eXBlLCBuYW1lOiBuYW1lfSB9LFxuICAgICAgICBwZWckYzU3ID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcImxpbmUgZGVmaW5pdGlvblwiIH0sXG4gICAgICAgIHBlZyRjNTggPSBmdW5jdGlvbih0eXBlLCBwb2ludHMpIHsgcmV0dXJuIG8oe3R5cGU6IHR5cGUsIHBvaW50czogcG9pbnRzfSkgfSxcbiAgICAgICAgcGVnJGM1OSA9IFwibGluZSBzZWdtZW50XCIsXG4gICAgICAgIHBlZyRjNjAgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJsaW5lIHNlZ21lbnRcIiwgZGVzY3JpcHRpb246IFwiXFxcImxpbmUgc2VnbWVudFxcXCJcIiB9LFxuICAgICAgICBwZWckYzYxID0gXCJzZWdtZW50XCIsXG4gICAgICAgIHBlZyRjNjIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJzZWdtZW50XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJzZWdtZW50XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNjMgPSBcImxpbmVcIixcbiAgICAgICAgcGVnJGM2NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImxpbmVcIiwgZGVzY3JpcHRpb246IFwiXFxcImxpbmVcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM2NSA9IGZ1bmN0aW9uKGxpbmUpIHtyZXR1cm4gKGxpbmUgPT09ICdsaW5lJykgPyAnbGluZScgOiAnc2VnbWVudCcgfSxcbiAgICAgICAgcGVnJGM2NiA9IFwiZnJvbVwiLFxuICAgICAgICBwZWckYzY3ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiZnJvbVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiZnJvbVxcXCJcIiB9LFxuICAgICAgICBwZWckYzY4ID0gXCJ0b1wiLFxuICAgICAgICBwZWckYzY5ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidG9cIiwgZGVzY3JpcHRpb246IFwiXFxcInRvXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNzAgPSBmdW5jdGlvbihwMSwgcDIpIHsgcmV0dXJuIFtwMSxwMl07IH0sXG4gICAgICAgIHBlZyRjNzEgPSBcImRldGVybWluZWQgYnlcIixcbiAgICAgICAgcGVnJGM3MiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImRldGVybWluZWQgYnlcIiwgZGVzY3JpcHRpb246IFwiXFxcImRldGVybWluZWQgYnlcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM3MyA9IFwiYmV0d2VlblwiLFxuICAgICAgICBwZWckYzc0ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiYmV0d2VlblwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYmV0d2VlblxcXCJcIiB9LFxuICAgICAgICBwZWckYzc1ID0gXCJqb2luaW5nXCIsXG4gICAgICAgIHBlZyRjNzYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJqb2luaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJqb2luaW5nXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNzcgPSBcIndpdGggZW5kcG9pbnRzXCIsXG4gICAgICAgIHBlZyRjNzggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJ3aXRoIGVuZHBvaW50c1wiLCBkZXNjcmlwdGlvbjogXCJcXFwid2l0aCBlbmRwb2ludHNcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM3OSA9IGZ1bmN0aW9uKHAxLCBwMikgeyByZXR1cm4gW3AxLCBwMl07IH0sXG4gICAgICAgIHBlZyRjODAgPSBcImludGVyc2VjdGlvbiBvZlwiLFxuICAgICAgICBwZWckYzgxID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiaW50ZXJzZWN0aW9uIG9mXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJpbnRlcnNlY3Rpb24gb2ZcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM4MiA9IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGM7fSxcbiAgICAgICAgcGVnJGM4MyA9IGZ1bmN0aW9uKG9iamVjdHMsIHdoaWNoKSB7cmV0dXJuIG8oe3R5cGU6ICdpbnRlcnNlY3Rpb24nLCBvYmplY3RzOm9iamVjdHMsIHdoaWNoOiB3aGljaH0pO30sXG4gICAgICAgIHBlZyRjODQgPSBmdW5jdGlvbihvMSwgbzIpIHsgcmV0dXJuIFtvMSwgbzJdIH0sXG4gICAgICAgIHBlZyRjODUgPSBmdW5jdGlvbihvMSwgbzIpIHsgcmV0dXJuIFt7dHlwZTondW5rbm93bicsbmFtZTpvMX0se3R5cGU6J3Vua25vd24nLG5hbWU6bzJ9XTsgfSxcbiAgICAgICAgcGVnJGM4NiA9IFwidGhhdFwiLFxuICAgICAgICBwZWckYzg3ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidGhhdFwiLCBkZXNjcmlwdGlvbjogXCJcXFwidGhhdFxcXCJcIiB9LFxuICAgICAgICBwZWckYzg4ID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4ge29wOidub3QnLCBhcmdzOltuYW1lXX0gfSxcbiAgICAgICAgcGVnJGM4OSA9IFwidGhhdCBpcyBvblwiLFxuICAgICAgICBwZWckYzkwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidGhhdCBpcyBvblwiLCBkZXNjcmlwdGlvbjogXCJcXFwidGhhdCBpcyBvblxcXCJcIiB9LFxuICAgICAgICBwZWckYzkxID0gZnVuY3Rpb24ob2JqKSB7IHJldHVybiB7b3A6ICdvbicsIGFyZ3M6W29ial19IH0sXG4gICAgICAgIHBlZyRjOTIgPSBcImFuZCBjYWxsIGl0XCIsXG4gICAgICAgIHBlZyRjOTMgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJhbmQgY2FsbCBpdFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYW5kIGNhbGwgaXRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM5NCA9IFwiY2FsbGVkXCIsXG4gICAgICAgIHBlZyRjOTUgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJjYWxsZWRcIiwgZGVzY3JpcHRpb246IFwiXFxcImNhbGxlZFxcXCJcIiB9LFxuICAgICAgICBwZWckYzk2ID0gXCJuYW1lZFwiLFxuICAgICAgICBwZWckYzk3ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibmFtZWRcIiwgZGVzY3JpcHRpb246IFwiXFxcIm5hbWVkXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjOTggPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiBuYW1lOyB9LFxuICAgICAgICBwZWckYzk5ID0gXCJ3aXRoIGNlbnRlclwiLFxuICAgICAgICBwZWckYzEwMCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIndpdGggY2VudGVyXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ3aXRoIGNlbnRlclxcXCJcIiB9LFxuICAgICAgICBwZWckYzEwMSA9IFwiY2VudGVyZWQgYXRcIixcbiAgICAgICAgcGVnJGMxMDIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJjZW50ZXJlZCBhdFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiY2VudGVyZWQgYXRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMDMgPSBcImFcIixcbiAgICAgICAgcGVnJGMxMDQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJhXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJhXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTA1ID0gXCJhblwiLFxuICAgICAgICBwZWckYzEwNiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImFuXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJhblxcXCJcIiB9LFxuICAgICAgICBwZWckYzEwNyA9IFwidGhlXCIsXG4gICAgICAgIHBlZyRjMTA4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidGhlXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ0aGVcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMDkgPSBcInRocm91Z2hcIixcbiAgICAgICAgcGVnJGMxMTAgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJ0aHJvdWdoXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ0aHJvdWdoXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTExID0gXCJjb250YWluaW5nXCIsXG4gICAgICAgIHBlZyRjMTEyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiY29udGFpbmluZ1wiLCBkZXNjcmlwdGlvbjogXCJcXFwiY29udGFpbmluZ1xcXCJcIiB9LFxuICAgICAgICBwZWckYzExMyA9IFwiaXNuJ3RcIixcbiAgICAgICAgcGVnJGMxMTQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJpc24ndFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiaXNuJ3RcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMTUgPSBcImlzbnRcIixcbiAgICAgICAgcGVnJGMxMTYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJpc250XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJpc250XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTE3ID0gXCJpcyBub3RcIixcbiAgICAgICAgcGVnJGMxMTggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJpcyBub3RcIiwgZGVzY3JpcHRpb246IFwiXFxcImlzIG5vdFxcXCJcIiB9LFxuICAgICAgICBwZWckYzExOSA9IHsgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogXCJ3aGl0ZXNwYWNlIGNoYXJhY3RlclwiIH0sXG4gICAgICAgIHBlZyRjMTIwID0gXCIgXCIsXG4gICAgICAgIHBlZyRjMTIxID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiIFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiIFxcXCJcIiB9LFxuICAgICAgICBwZWckYzEyMiA9IHsgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogXCJ3aGl0ZXNwYWNlXCIgfSxcbiAgICAgICAgcGVnJGMxMjMgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwibnVtYmVyXCIgfSxcbiAgICAgICAgcGVnJGMxMjQgPSAvXlswLTkuXFwtXS8sXG4gICAgICAgIHBlZyRjMTI1ID0geyB0eXBlOiBcImNsYXNzXCIsIHZhbHVlOiBcIlswLTkuXFxcXC1dXCIsIGRlc2NyaXB0aW9uOiBcIlswLTkuXFxcXC1dXCIgfSxcbiAgICAgICAgcGVnJGMxMjYgPSBmdW5jdGlvbihkaWdpdHMpIHsgcmV0dXJuIHBhcnNlSW50KGRpZ2l0cy5qb2luKFwiXCIpLCAxMCk7IH0sXG4gICAgICAgIHBlZyRjMTI3ID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcInZhcmlhYmxlIG5hbWVcIiB9LFxuICAgICAgICBwZWckYzEyOCA9IC9eW2EtekEtWjAtOV0vLFxuICAgICAgICBwZWckYzEyOSA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbYS16QS1aMC05XVwiLCBkZXNjcmlwdGlvbjogXCJbYS16QS1aMC05XVwiIH0sXG4gICAgICAgIHBlZyRjMTMwID0gZnVuY3Rpb24oY2hhcnMpIHsgcmV0dXJuIGNoYXJzLmpvaW4oJycpOyB9LFxuXG4gICAgICAgIHBlZyRjdXJyUG9zICAgICAgICAgID0gMCxcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zICAgICAgPSAwLFxuICAgICAgICBwZWckY2FjaGVkUG9zICAgICAgICA9IDAsXG4gICAgICAgIHBlZyRjYWNoZWRQb3NEZXRhaWxzID0geyBsaW5lOiAxLCBjb2x1bW46IDEsIHNlZW5DUjogZmFsc2UgfSxcbiAgICAgICAgcGVnJG1heEZhaWxQb3MgICAgICAgPSAwLFxuICAgICAgICBwZWckbWF4RmFpbEV4cGVjdGVkICA9IFtdLFxuICAgICAgICBwZWckc2lsZW50RmFpbHMgICAgICA9IDAsXG5cbiAgICAgICAgcGVnJHJlc3VsdDtcblxuICAgIGlmIChcInN0YXJ0UnVsZVwiIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmICghKG9wdGlvbnMuc3RhcnRSdWxlIGluIHBlZyRzdGFydFJ1bGVGdW5jdGlvbnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHN0YXJ0IHBhcnNpbmcgZnJvbSBydWxlIFxcXCJcIiArIG9wdGlvbnMuc3RhcnRSdWxlICsgXCJcXFwiLlwiKTtcbiAgICAgIH1cblxuICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uID0gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uc1tvcHRpb25zLnN0YXJ0UnVsZV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGV4dCgpIHtcbiAgICAgIHJldHVybiBpbnB1dC5zdWJzdHJpbmcocGVnJHJlcG9ydGVkUG9zLCBwZWckY3VyclBvcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2Zmc2V0KCkge1xuICAgICAgcmV0dXJuIHBlZyRyZXBvcnRlZFBvcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaW5lKCkge1xuICAgICAgcmV0dXJuIHBlZyRjb21wdXRlUG9zRGV0YWlscyhwZWckcmVwb3J0ZWRQb3MpLmxpbmU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sdW1uKCkge1xuICAgICAgcmV0dXJuIHBlZyRjb21wdXRlUG9zRGV0YWlscyhwZWckcmVwb3J0ZWRQb3MpLmNvbHVtbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHBlY3RlZChkZXNjcmlwdGlvbikge1xuICAgICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKFxuICAgICAgICBudWxsLFxuICAgICAgICBbeyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbiB9XSxcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zXG4gICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UpIHtcbiAgICAgIHRocm93IHBlZyRidWlsZEV4Y2VwdGlvbihtZXNzYWdlLCBudWxsLCBwZWckcmVwb3J0ZWRQb3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRjb21wdXRlUG9zRGV0YWlscyhwb3MpIHtcbiAgICAgIGZ1bmN0aW9uIGFkdmFuY2UoZGV0YWlscywgc3RhcnRQb3MsIGVuZFBvcykge1xuICAgICAgICB2YXIgcCwgY2g7XG5cbiAgICAgICAgZm9yIChwID0gc3RhcnRQb3M7IHAgPCBlbmRQb3M7IHArKykge1xuICAgICAgICAgIGNoID0gaW5wdXQuY2hhckF0KHApO1xuICAgICAgICAgIGlmIChjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgaWYgKCFkZXRhaWxzLnNlZW5DUikgeyBkZXRhaWxzLmxpbmUrKzsgfVxuICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4gPSAxO1xuICAgICAgICAgICAgZGV0YWlscy5zZWVuQ1IgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIlxcclwiIHx8IGNoID09PSBcIlxcdTIwMjhcIiB8fCBjaCA9PT0gXCJcXHUyMDI5XCIpIHtcbiAgICAgICAgICAgIGRldGFpbHMubGluZSsrO1xuICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4gPSAxO1xuICAgICAgICAgICAgZGV0YWlscy5zZWVuQ1IgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXRhaWxzLmNvbHVtbisrO1xuICAgICAgICAgICAgZGV0YWlscy5zZWVuQ1IgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHBlZyRjYWNoZWRQb3MgIT09IHBvcykge1xuICAgICAgICBpZiAocGVnJGNhY2hlZFBvcyA+IHBvcykge1xuICAgICAgICAgIHBlZyRjYWNoZWRQb3MgPSAwO1xuICAgICAgICAgIHBlZyRjYWNoZWRQb3NEZXRhaWxzID0geyBsaW5lOiAxLCBjb2x1bW46IDEsIHNlZW5DUjogZmFsc2UgfTtcbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKHBlZyRjYWNoZWRQb3NEZXRhaWxzLCBwZWckY2FjaGVkUG9zLCBwb3MpO1xuICAgICAgICBwZWckY2FjaGVkUG9zID0gcG9zO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGVnJGNhY2hlZFBvc0RldGFpbHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJGZhaWwoZXhwZWN0ZWQpIHtcbiAgICAgIGlmIChwZWckY3VyclBvcyA8IHBlZyRtYXhGYWlsUG9zKSB7IHJldHVybjsgfVxuXG4gICAgICBpZiAocGVnJGN1cnJQb3MgPiBwZWckbWF4RmFpbFBvcykge1xuICAgICAgICBwZWckbWF4RmFpbFBvcyA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBwZWckbWF4RmFpbEV4cGVjdGVkID0gW107XG4gICAgICB9XG5cbiAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQucHVzaChleHBlY3RlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJGJ1aWxkRXhjZXB0aW9uKG1lc3NhZ2UsIGV4cGVjdGVkLCBwb3MpIHtcbiAgICAgIGZ1bmN0aW9uIGNsZWFudXBFeHBlY3RlZChleHBlY3RlZCkge1xuICAgICAgICB2YXIgaSA9IDE7XG5cbiAgICAgICAgZXhwZWN0ZWQuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgaWYgKGEuZGVzY3JpcHRpb24gPCBiLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgfSBlbHNlIGlmIChhLmRlc2NyaXB0aW9uID4gYi5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBleHBlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgICBpZiAoZXhwZWN0ZWRbaSAtIDFdID09PSBleHBlY3RlZFtpXSkge1xuICAgICAgICAgICAgZXhwZWN0ZWQuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGJ1aWxkTWVzc2FnZShleHBlY3RlZCwgZm91bmQpIHtcbiAgICAgICAgZnVuY3Rpb24gc3RyaW5nRXNjYXBlKHMpIHtcbiAgICAgICAgICBmdW5jdGlvbiBoZXgoY2gpIHsgcmV0dXJuIGNoLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH1cblxuICAgICAgICAgIHJldHVybiBzXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAgICdcXFxcXFxcXCcpXG4gICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgICAgJ1xcXFxcIicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx4MDgvZywgJ1xcXFxiJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHQvZywgICAnXFxcXHQnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAgICdcXFxcbicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxmL2csICAgJ1xcXFxmJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgICAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHgwMC1cXHgwN1xceDBCXFx4MEVcXHgwRl0vZywgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxceDAnICsgaGV4KGNoKTsgfSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx4MTAtXFx4MUZcXHg4MC1cXHhGRl0vZywgICAgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxceCcgICsgaGV4KGNoKTsgfSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx1MDE4MC1cXHUwRkZGXS9nLCAgICAgICAgIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHUwJyArIGhleChjaCk7IH0pXG4gICAgICAgICAgICAucmVwbGFjZSgvW1xcdTEwODAtXFx1RkZGRl0vZywgICAgICAgICBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx1JyAgKyBoZXgoY2gpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBleHBlY3RlZERlc2NzID0gbmV3IEFycmF5KGV4cGVjdGVkLmxlbmd0aCksXG4gICAgICAgICAgICBleHBlY3RlZERlc2MsIGZvdW5kRGVzYywgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXhwZWN0ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBleHBlY3RlZERlc2NzW2ldID0gZXhwZWN0ZWRbaV0uZGVzY3JpcHRpb247XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3RlZERlc2MgPSBleHBlY3RlZC5sZW5ndGggPiAxXG4gICAgICAgICAgPyBleHBlY3RlZERlc2NzLnNsaWNlKDAsIC0xKS5qb2luKFwiLCBcIilcbiAgICAgICAgICAgICAgKyBcIiBvciBcIlxuICAgICAgICAgICAgICArIGV4cGVjdGVkRGVzY3NbZXhwZWN0ZWQubGVuZ3RoIC0gMV1cbiAgICAgICAgICA6IGV4cGVjdGVkRGVzY3NbMF07XG5cbiAgICAgICAgZm91bmREZXNjID0gZm91bmQgPyBcIlxcXCJcIiArIHN0cmluZ0VzY2FwZShmb3VuZCkgKyBcIlxcXCJcIiA6IFwiZW5kIG9mIGlucHV0XCI7XG5cbiAgICAgICAgcmV0dXJuIFwiRXhwZWN0ZWQgXCIgKyBleHBlY3RlZERlc2MgKyBcIiBidXQgXCIgKyBmb3VuZERlc2MgKyBcIiBmb3VuZC5cIjtcbiAgICAgIH1cblxuICAgICAgdmFyIHBvc0RldGFpbHMgPSBwZWckY29tcHV0ZVBvc0RldGFpbHMocG9zKSxcbiAgICAgICAgICBmb3VuZCAgICAgID0gcG9zIDwgaW5wdXQubGVuZ3RoID8gaW5wdXQuY2hhckF0KHBvcykgOiBudWxsO1xuXG4gICAgICBpZiAoZXhwZWN0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgY2xlYW51cEV4cGVjdGVkKGV4cGVjdGVkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgbWVzc2FnZSAhPT0gbnVsbCA/IG1lc3NhZ2UgOiBidWlsZE1lc3NhZ2UoZXhwZWN0ZWQsIGZvdW5kKSxcbiAgICAgICAgZXhwZWN0ZWQsXG4gICAgICAgIGZvdW5kLFxuICAgICAgICBwb3MsXG4gICAgICAgIHBvc0RldGFpbHMubGluZSxcbiAgICAgICAgcG9zRGV0YWlscy5jb2x1bW5cbiAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlc3RhcnQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZWRlY2xhcmF0aW9uX2xpc3QoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IFtdO1xuICAgICAgICBpZiAocGVnJGMyLnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMyA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMpOyB9XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIucHVzaChzMyk7XG4gICAgICAgICAgaWYgKHBlZyRjMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzMyA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMyk7IH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzQoczEpO1xuICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VkZWNsYXJhdGlvbl9saXN0KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczU7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZWRlY2xhcmF0aW9uKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBbXTtcbiAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgczQgPSBbXTtcbiAgICAgICAgaWYgKHBlZyRjMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHdoaWxlIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQucHVzaChzNSk7XG4gICAgICAgICAgICBpZiAocGVnJGMyLnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMyk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczUgPSBwZWckcGFyc2VkZWNsYXJhdGlvbigpO1xuICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczM7XG4gICAgICAgICAgICBzNCA9IHBlZyRjNShzNSk7XG4gICAgICAgICAgICBzMyA9IHM0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgczMgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgczMgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIucHVzaChzMyk7XG4gICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBzNCA9IFtdO1xuICAgICAgICAgIGlmIChwZWckYzIudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgd2hpbGUgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgICBpZiAocGVnJGMyLnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICBzNSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMpOyB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2VkZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMzO1xuICAgICAgICAgICAgICBzNCA9IHBlZyRjNShzNSk7XG4gICAgICAgICAgICAgIHMzID0gczQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICBzMyA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgIHMzID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICBzMSA9IHBlZyRjNihzMSwgczIpO1xuICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VkZWNsYXJhdGlvbigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4O1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZWNvbW1lbnQoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzgpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzkpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IFtzMiwgczNdO1xuICAgICAgICAgICAgczEgPSBzMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMxID0gcGVnJGM3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJHBhcnNldmFyaWFibGUoKTtcbiAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTApIHtcbiAgICAgICAgICAgICAgICBzNCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMik7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzExKTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTIpIHtcbiAgICAgICAgICAgICAgICAgIHM0ID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KTtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMyk7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDYxKSB7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMxNDtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzE1KTsgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlb2JqZWN0X2xpdGVyYWwoKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVnJGMxNi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczggPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgczggPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxNyk7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoczggIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNy5wdXNoKHM4KTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJGMxNi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzOCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTcpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJGMxODtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxOSk7IH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHM4ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRjNztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGMyMChzMiwgczYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMyMSkge1xuICAgICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzIyKTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlb2JqZWN0X2xpdGVyYWwoKTtcbiAgICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlY2FsbGVkKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJGMyMyhzNik7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gczU7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNDtcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczQgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGM3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM1ID0gW107XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJGMxNi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzE3KTsgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgd2hpbGUgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM1LnB1c2goczYpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVnJGMxNi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczYgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxNyk7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjMTg7XG4gICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzE5KTsgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNiA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJGM3O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGMyNChzMywgczQpO1xuICAgICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWNvbW1lbnQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMzUpIHtcbiAgICAgICAgczEgPSBwZWckYzI1O1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMjYpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgIGlmIChzMiA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJGM3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgczQgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGMyNy50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzNSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMjgpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHdoaWxlIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQucHVzaChzNSk7XG4gICAgICAgICAgICBpZiAocGVnJGMyNy50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzI4KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuc3Vic3RyaW5nKHMzLCBwZWckY3VyclBvcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHMzID0gczQ7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMyOShzMyk7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb2JqZWN0X2xpdGVyYWwoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlcG9pbnRfbGl0ZXJhbCgpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlb2JqZWN0XzJkX2xpdGVyYWwoKTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczAgPSBwZWckcGFyc2VpbnRlcnNlY3Rpb24oKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb2JqZWN0XzJkX2xpdGVyYWwoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlY2lyY2xlX2xpdGVyYWwoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZWxpbmVfbGl0ZXJhbCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb2JqZWN0XzJkX3JlZmVyZW5jZSgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgczAgPSBwZWckcGFyc2VjaXJjbGVfcmVmZXJlbmNlKCk7XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckcGFyc2VsaW5lX3JlZmVyZW5jZSgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlcG9pbnQoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlcG9pbnRfbGl0ZXJhbCgpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlaW50ZXJzZWN0aW9uKCk7XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMwID0gcGVnJHBhcnNlcG9pbnRfcmVmZXJlbmNlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXBvaW50X3JlZmVyZW5jZSgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1O1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRjdXJyUG9zO1xuICAgICAgczIgPSBwZWckcGFyc2VhdGhlKCk7XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMzMSkge1xuICAgICAgICAgIHMzID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzIpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczQgPSBbXTtcbiAgICAgICAgICBzNSA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICB3aGlsZSAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBbczIsIHMzLCBzNF07XG4gICAgICAgICAgICBzMSA9IHMyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJGM3O1xuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNldmFyaWFibGUoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzMzKHMyKTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzApOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vwb2ludF9saXRlcmFsKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNywgczgsIHM5LCBzMTA7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMiA9IHBlZyRwYXJzZWF0aGUoKTtcbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzMxKSB7XG4gICAgICAgICAgczMgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzMik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzNCA9IFtdO1xuICAgICAgICAgIHM1ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgIHdoaWxlIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQucHVzaChzNSk7XG4gICAgICAgICAgICBzNSA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IFtzMiwgczMsIHM0XTtcbiAgICAgICAgICAgIHMxID0gczI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgICBzMSA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckYzc7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0MCkge1xuICAgICAgICAgIHMyID0gcGVnJGMzNTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzYpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgaWYgKHMzID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjNztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZW51bWJlcigpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICBpZiAoczUgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRjNztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjMzc7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzgpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoczcgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckYzc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczggPSBwZWckcGFyc2VudW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHM5ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRjNztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHM5ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMxMCA9IHBlZyRjMzk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDApOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEwICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNDEoczQsIHM4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzQpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjaXJjbGUoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlY2lyY2xlX3JlZmVyZW5jZSgpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlY2lyY2xlX2xpdGVyYWwoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWNpcmNsZV9yZWZlcmVuY2UoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDMpIHtcbiAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpO1xuICAgICAgICBwZWckY3VyclBvcyArPSA2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDQpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNldmFyaWFibGUoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzQ1KHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0Mik7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWNpcmNsZV9saXRlcmFsKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNywgczg7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlYXRoZSgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDMpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNik7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQ0KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VjaXJjbGVfY3JpdGVyaW9uKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM0Nykge1xuICAgICAgICAgICAgICAgICAgczcgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpO1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgczcgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQ4KTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM3ID0gW3M3LCBzOF07XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gczc7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM2O1xuICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNjtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczYgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJGM3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJHBhcnNlY2lyY2xlX2NyaXRlcmlvbigpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNDkoczQsIHM3KTtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDYpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjaXJjbGVfY3JpdGVyaW9uKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VjZW50ZXJlZGF0KCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlcG9pbnQoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzUwKHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2V0aHJvdWdoKCk7XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckcGFyc2Vwb2ludCgpO1xuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMSA9IHBlZyRjNTEoczMpO1xuICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbGluZSgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgczAgPSBwZWckcGFyc2VsaW5lX3JlZmVyZW5jZSgpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlbGluZV9saXRlcmFsKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VsaW5lX3JlZmVyZW5jZSgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNjtcblxuICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VhdGhlKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VsaW5lb3JzZWcoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZXBvaW50X3JlZmVyZW5jZSgpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDUpIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRjNTM7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzU0KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlcG9pbnRfcmVmZXJlbmNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGM1NShzMiwgczQsIHM2KTtcbiAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2VsaW5lb3JzZWcoKTtcbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgIHMxID0gcGVnJGM1NihzMSwgczMpO1xuICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTIpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VsaW5lX2xpdGVyYWwoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZWF0aGUoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZWxpbmVvcnNlZygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNldHdvX3BvaW50cygpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMSA9IHBlZyRjNTgoczIsIHM0KTtcbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTcpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VsaW5lb3JzZWcoKSB7XG4gICAgICB2YXIgczAsIHMxO1xuXG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM1OSkge1xuICAgICAgICBzMCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTIpO1xuICAgICAgICBwZWckY3VyclBvcyArPSAxMjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzYwKTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNjEpIHtcbiAgICAgICAgICBzMCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzYyKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM2Mykge1xuICAgICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzY0KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzY1KHMxKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldHdvX3BvaW50cygpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM2Nikge1xuICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCk7XG4gICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2Nyk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2Vwb2ludCgpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM2OCkge1xuICAgICAgICAgICAgICAgIHM1ID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKTtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjkpOyB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZXBvaW50KCk7XG4gICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGM3MChzMywgczcpO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2V0aHJvdWdoKCk7XG4gICAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEzKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzcxKSB7XG4gICAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTMpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM3Mik7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA3KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzczKSB7XG4gICAgICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA3KTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzc0KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNzUpIHtcbiAgICAgICAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNyk7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzc2KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDE0KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzc3KSB7XG4gICAgICAgICAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTQpO1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM3OCk7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZXBvaW50KCk7XG4gICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDcpIHtcbiAgICAgICAgICAgICAgICAgIHM2ID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKTtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0OCk7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNSA9IFtzNSwgczYsIHM3XTtcbiAgICAgICAgICAgICAgICAgICAgczQgPSBzNTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICBzNSA9IFtdO1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczUucHVzaChzNik7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJGMzNztcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM4KTsgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM3ID0gW107XG4gICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoczggIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNy5wdXNoKHM4KTtcbiAgICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNSA9IFtzNSwgczYsIHM3XTtcbiAgICAgICAgICAgICAgICAgICAgICBzNCA9IHM1O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlcG9pbnQoKTtcbiAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzc5KHMzLCBzNSk7XG4gICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWludGVyc2VjdGlvbigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczc7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZWF0aGUoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxNSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM4MCkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxNSk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM4MSk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlaW50ZXJzZWN0aW9uX29iamVjdHMoKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2VpbnRlcnNlY3Rpb25fY29uZGl0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzNTtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJGM4MihzNyk7XG4gICAgICAgICAgICAgICAgICBzNSA9IHM2O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM1O1xuICAgICAgICAgICAgICAgICAgczUgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczU7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM1ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckYzc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczEgPSBwZWckYzgzKHM0LCBzNSk7XG4gICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWludGVyc2VjdGlvbl9vYmplY3RzKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VvYmplY3RfMmRfcmVmZXJlbmNlKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckY3VyclBvcztcbiAgICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDcpIHtcbiAgICAgICAgICAgIHM0ID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0OCk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzMyA9IFtzMywgczQsIHM1XTtcbiAgICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgczIgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgczIgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgIHM0ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJGMzNztcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM4KTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gW107XG4gICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICB3aGlsZSAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNS5wdXNoKHM2KTtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMyA9IFtzMywgczQsIHM1XTtcbiAgICAgICAgICAgICAgICBzMiA9IHMzO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgICAgczIgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgczIgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlb2JqZWN0XzJkX3JlZmVyZW5jZSgpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjODQoczEsIHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2V2YXJpYWJsZSgpO1xuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM0Nykge1xuICAgICAgICAgICAgICBzNCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0OCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczMgPSBbczMsIHM0LCBzNV07XG4gICAgICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczIgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICBzMyA9IFtdO1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDQpIHtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMzc7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM4KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM1ID0gW107XG4gICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNS5wdXNoKHM2KTtcbiAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHMzID0gW3MzLCBzNCwgczVdO1xuICAgICAgICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgIHMxID0gcGVnJGM4NShzMSwgczMpO1xuICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlaW50ZXJzZWN0aW9uX2NvbmRpdGlvbigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM4Nikge1xuICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCk7XG4gICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM4Nyk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2Vpc250KCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGM4OChzNSk7XG4gICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM4OSkge1xuICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMCk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5MCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlb2JqZWN0XzJkX3JlZmVyZW5jZSgpO1xuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMSA9IHBlZyRjOTEoczMpO1xuICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlY2FsbGVkKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTEpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjOTIpIHtcbiAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDExKTtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5Myk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzk0KSB7XG4gICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5NSk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzk2KSB7XG4gICAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSk7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOTcpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNldmFyaWFibGUoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzk4KHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjZW50ZXJlZGF0KCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM5OSkge1xuICAgICAgICBzMCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTEpO1xuICAgICAgICBwZWckY3VyclBvcyArPSAxMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEwMCk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMxMDEpIHtcbiAgICAgICAgICBzMCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTEpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDExO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTAyKTsgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VhcnRpY2xlKCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDk3KSB7XG4gICAgICAgIHMwID0gcGVnJGMxMDM7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMDQpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMikgPT09IHBlZyRjMTA1KSB7XG4gICAgICAgICAgczAgPSBwZWckYzEwNTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTA2KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpID09PSBwZWckYzEwNykge1xuICAgICAgICAgICAgczAgPSBwZWckYzEwNztcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMDgpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2V0aHJvdWdoKCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA3KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzEwOSkge1xuICAgICAgICBzMCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNyk7XG4gICAgICAgIHBlZyRjdXJyUG9zICs9IDc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMTApOyB9XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTExKSB7XG4gICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEwKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAxMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzExMik7IH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlaXNudCgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMxMTMpIHtcbiAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpO1xuICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTE0KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTE1KSB7XG4gICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMTYpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMxMTcpIHtcbiAgICAgICAgICAgIHMwID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDY7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMTgpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VhdGhlKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczI7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZWFydGljbGUoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczEgPSBbczEsIHMyXTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGM3O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlcygpIHtcbiAgICAgIHZhciBzMCwgczE7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAzMikge1xuICAgICAgICBzMCA9IHBlZyRjMTIwO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTIxKTsgfVxuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTE5KTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlXygpIHtcbiAgICAgIHZhciBzMCwgczE7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBbXTtcbiAgICAgIHMxID0gcGVnJHBhcnNlcygpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHdoaWxlIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMwLnB1c2goczEpO1xuICAgICAgICAgIHMxID0gcGVnJHBhcnNlcygpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyMik7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW51bWJlcigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjMTI0LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTI1KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICAgIGlmIChwZWckYzEyNC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTI1KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgIHMxID0gcGVnJGMxMjYoczEpO1xuICAgICAgfVxuICAgICAgczAgPSBzMTtcbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyMyk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXZhcmlhYmxlKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczI7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBpZiAocGVnJGMxMjgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMjkpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgICAgaWYgKHBlZyRjMTI4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMjkpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgczEgPSBwZWckYzEzMChzMSk7XG4gICAgICB9XG4gICAgICBzMCA9IHMxO1xuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTI3KTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG5cbiAgICAgIC8vIHByZXByb2Nlc3M6IFxuICAgICAgLy8gbm9ybWFsaXplIHdoaXRlc3BhY2UgdG8gc2luZ2xlIHNwYWNlIC8gc2luZ2xlIG5ld2xpbmVcbiAgICAgIFxuICAgICAgZnVuY3Rpb24gbmFtZWQob2JqLCBuYW1lKSB7XG4gICAgICAgIG9iai5uYW1lID0gbmFtZTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLyogYW5ub3RhdGUgdGhlIGdpdmVuIG9iamVjdCB3aXRoIHNvdXJjZSBpbmZvICovXG4gICAgICBmdW5jdGlvbiBvKG9iaikge1xuICAgICAgICBvYmouc291cmNlID0ge1xuICAgICAgICAgIHRleHQ6IHRleHQoKSxcbiAgICAgICAgICBsaW5lOiBsaW5lKCksXG4gICAgICAgICAgY29sdW1uOiBjb2x1bW4oKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cblxuICAgIHBlZyRyZXN1bHQgPSBwZWckc3RhcnRSdWxlRnVuY3Rpb24oKTtcblxuICAgIGlmIChwZWckcmVzdWx0ICE9PSBwZWckRkFJTEVEICYmIHBlZyRjdXJyUG9zID09PSBpbnB1dC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBwZWckcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocGVnJHJlc3VsdCAhPT0gcGVnJEZBSUxFRCAmJiBwZWckY3VyclBvcyA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBwZWckZmFpbCh7IHR5cGU6IFwiZW5kXCIsIGRlc2NyaXB0aW9uOiBcImVuZCBvZiBpbnB1dFwiIH0pO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBwZWckYnVpbGRFeGNlcHRpb24obnVsbCwgcGVnJG1heEZhaWxFeHBlY3RlZCwgcGVnJG1heEZhaWxQb3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgU3ludGF4RXJyb3I6IFN5bnRheEVycm9yLFxuICAgIHBhcnNlOiAgICAgICBwYXJzZVxuICB9O1xufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiXG5cbmZ1bmN0aW9uIHVuaXF1ZV9wcmVkKGxpc3QsIGNvbXBhcmUpIHtcbiAgdmFyIHB0ciA9IDFcbiAgICAsIGxlbiA9IGxpc3QubGVuZ3RoXG4gICAgLCBhPWxpc3RbMF0sIGI9bGlzdFswXVxuICBmb3IodmFyIGk9MTsgaTxsZW47ICsraSkge1xuICAgIGIgPSBhXG4gICAgYSA9IGxpc3RbaV1cbiAgICBpZihjb21wYXJlKGEsIGIpKSB7XG4gICAgICBpZihpID09PSBwdHIpIHtcbiAgICAgICAgcHRyKytcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGxpc3RbcHRyKytdID0gYVxuICAgIH1cbiAgfVxuICBsaXN0Lmxlbmd0aCA9IHB0clxuICByZXR1cm4gbGlzdFxufVxuXG5mdW5jdGlvbiB1bmlxdWVfZXEobGlzdCkge1xuICB2YXIgcHRyID0gMVxuICAgICwgbGVuID0gbGlzdC5sZW5ndGhcbiAgICAsIGE9bGlzdFswXSwgYiA9IGxpc3RbMF1cbiAgZm9yKHZhciBpPTE7IGk8bGVuOyArK2ksIGI9YSkge1xuICAgIGIgPSBhXG4gICAgYSA9IGxpc3RbaV1cbiAgICBpZihhICE9PSBiKSB7XG4gICAgICBpZihpID09PSBwdHIpIHtcbiAgICAgICAgcHRyKytcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGxpc3RbcHRyKytdID0gYVxuICAgIH1cbiAgfVxuICBsaXN0Lmxlbmd0aCA9IHB0clxuICByZXR1cm4gbGlzdFxufVxuXG5mdW5jdGlvbiB1bmlxdWUobGlzdCwgY29tcGFyZSwgc29ydGVkKSB7XG4gIGlmKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuICBpZihjb21wYXJlKSB7XG4gICAgaWYoIXNvcnRlZCkge1xuICAgICAgbGlzdC5zb3J0KGNvbXBhcmUpXG4gICAgfVxuICAgIHJldHVybiB1bmlxdWVfcHJlZChsaXN0LCBjb21wYXJlKVxuICB9XG4gIGlmKCFzb3J0ZWQpIHtcbiAgICBsaXN0LnNvcnQoKVxuICB9XG4gIHJldHVybiB1bmlxdWVfZXEobGlzdClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1bmlxdWVcbiJdfQ==
