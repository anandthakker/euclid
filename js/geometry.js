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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvYmVoYXZpb3IuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvY2FsYy5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9pbnRlcnNlY3Rpb24uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvY2lyY2xlLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2dlb20uanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvaW5kZXguanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvaW50ZXJzZWN0aW9uLmpzIiwiL1VzZXJzL2FuYW5kL2Rldi9ldWNsaWQvbGliL21vZGVsL2xpbmUuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvcG9pbnQuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvbW9kZWwvc2VnbWVudC5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9wYXJzZS5qcyIsIi9Vc2Vycy9hbmFuZC9kZXYvZXVjbGlkL2xpYi9yZW5kZXIuanMiLCIvVXNlcnMvYW5hbmQvZGV2L2V1Y2xpZC9saWIvc2NlbmUuanMiLCJub2RlX21vZHVsZXMvZXVjbGlkLXBhcnNlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy91bmlxL3VuaXEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNDQSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXZCLFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRTtBQUNwQixHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFD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R0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxNQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRCxNQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztBQUN2RCxNQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQzs7QUFFdkQsTUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDM0MsTUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7O0FBRTNDLFNBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7Q0FDdEU7O0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFB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QUU7OztBQUVYLFFBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUM5QixLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQzVCLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFDeEIsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUUvQixRQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNmLFVBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLFFBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixRQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ1I7QUFDRCxRQUFJLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTs7QUFFdkQsUUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzNCO0FBQ0QsUUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7O0FBRTFELFFBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM3Qjs7QUFFRCxRQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNmLFVBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLFFBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixRQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ1I7QUFDRCxRQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTs7QUFFcEQsUUFBRSxH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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Z0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG52YXIgZDMgPSByZXF1aXJlKCdkMycpO1xuXG5mdW5jdGlvbiB0cmFuc2xhdGUocCkge1xuICBwLnggKz0gZDMuZXZlbnQuZHg7XG4gIHAueSArPSBkMy5ldmVudC5keTtcbn1cblxuXG5mdW5jdGlvbiBwb2ludCh1cGRhdGUpIHtcbiAgcmV0dXJuIGQzLmJlaGF2aW9yLmRyYWcoKVxuICAub24oJ2RyYWcnLCBmdW5jdGlvbihkKSB7XG4gICAgZC54ID0gZDMuZXZlbnQueDtcbiAgICBkLnkgPSBkMy5ldmVudC55O1xuICAgIHVwZGF0ZSgpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2lyY2xlKHVwZGF0ZSkge1xuICByZXR1cm4gZDMuYmVoYXZpb3IuZHJhZygpXG4gIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICBpZihkLmJvdW5kYXJ5UG9pbnQpIHtcbiAgICAgIGlmKGQuYm91bmRhcnlQb2ludC5mcmVlICYmIGQuY2VudGVyLmZyZWUpIHtcbiAgICAgICAgdHJhbnNsYXRlKGQuY2VudGVyKTtcbiAgICAgICAgdHJhbnNsYXRlKGQuYm91bmRhcnlQb2ludCk7XG4gICAgICB9XG4gICAgICBlbHNlIHsgcmV0dXJuOyB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbGV0IGR4ID0gZC5jZW50ZXIueCAtIGQzLmV2ZW50Lng7XG4gICAgICBsZXQgZHkgPSBkLmNlbnRlci55IC0gZDMuZXZlbnQueTtcbiAgICAgIGQucmFkaXVzID0gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpO1xuICAgIH1cbiAgICB1cGRhdGUoKTtcbiAgfSlcbn1cbiAgXG5mdW5jdGlvbiBsaW5lKHVwZGF0ZSkge1xuICByZXR1cm4gZDMuYmVoYXZpb3IuZHJhZygpXG4gIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICBpZihkLl9wLnNvbWUocD0+IXAuZnJlZSkpIHsgcmV0dXJuOyB9XG4gICAgZC5fcC5mb3JFYWNoKHRyYW5zbGF0ZSk7IC8vIFRPRE86IGF2b2lkIGFjY2Vzc2luZyBwcml2YXRlIF9wLi4uLlxuICAgIHVwZGF0ZSgpO1xuICB9KVxufVxuXG5mdW5jdGlvbiBmb2xsb3coc3ZnLCBwb2ludCwgdXBkYXRlKSB7XG4gIGxldCBmb2xsb3dpbmcgPSBmYWxzZTtcbiAgbGV0IHt4OiBtb3VzZXgsIHk6IG1vdXNleX0gPSBwb2ludDtcbiAgZDMuc2VsZWN0KCdib2R5Jykub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKCkge1xuICAgIChbbW91c2V4LCBtb3VzZXldID0gZDMubW91c2Uoc3ZnKSk7XG4gICAgaWYoIWZvbGxvd2luZykgc3RlcCgpO1xuICB9KTtcbiAgZnVuY3Rpb24gc3RlcCgpIHtcbiAgICBsZXQgZHggPSAobW91c2V4IC0gcG9pbnQueCksXG4gICAgICBkeSA9IChtb3VzZXkgLSBwb2ludC55KSxcbiAgICAgIGRzcSA9IGR4KmR4ICsgZHkqZHksXG4gICAgICBkID0gTWF0aC5zcXJ0KGRzcSk7XG4gICAgXG4gICAgaWYoZCA+IDEwKSB7XG4gICAgICBmb2xsb3dpbmcgPSB0cnVlO1xuICAgICAgcG9pbnQueCArPSBkeC9kO1xuICAgICAgcG9pbnQueSArPSBkeS9kO1xuICAgICAgdXBkYXRlKCk7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvbGxvd2luZyA9IGZhbHNlO1xuICAgIH1cbiAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtb3ZlOiB7IGNpcmNsZSwgbGluZSwgcG9pbnQgfSxcbiAgZm9sbG93XG59XG4iLCJcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRpc3RhbmNlLFxuICBkaXN0YW5jZVNxdWFyZWRcbn1cblxuLyogcmV0dXJucyB0aGUgRXVjbGlkZWFuIGRpc3RhbmNlIGJldHdlZW4gKHAxLngsIHAxLnkpIGFuZCAocDIueCwgcDIueSkgKi9cbmZ1bmN0aW9uIGRpc3RhbmNlKHAxLCBwMikge1xuICByZXR1cm4gTWF0aC5zcXJ0KGRpc3RhbmNlU3F1YXJlZChwMSwgcDIpKTtcbn1cblxuLyogcmV0dXJucyB0aGUgc3F1YXJlZCBFdWNsaWRlYW4gZGlzdGFuY2UgYmV0d2VlbiAocDEueCwgcDEueSkgYW5kIChwMi54LCBwMi55KSAqL1xuZnVuY3Rpb24gZGlzdGFuY2VTcXVhcmVkKHAxLCBwMikge1xuICBsZXQgZHggPSBwMS54IC0gcDIueCxcbiAgICAgIGR5ID0gcDEueSAtIHAyLnk7XG4gIHJldHVybiBkeCpkeCArIGR5KmR5O1xufVxuIiwiXG5sZXQgdW5pcSA9IHJlcXVpcmUoJ3VuaXEnKTtcblxubGV0IHtQb2ludCwgTGluZSwgU2VnbWVudCwgQ2lyY2xlfSA9IHJlcXVpcmUoJy4vbW9kZWwnKSxcbiAgICBQID0gUG9pbnQuUCxcbiAgICBkZCA9IHJlcXVpcmUoJy4vY2FsYycpLmRpc3RhbmNlU3F1YXJlZDtcblxuLyogaGVscGVycyAqL1xuZnVuY3Rpb24gY29tcGFyZVBvaW50cyhwLCBxKSB7IHJldHVybiAocC54ID09PSBxLnggJiYgcC55ID09PSBxLnkpID8gMCA6IDE7IH1cbmZ1bmN0aW9uIHNxKGEpIHsgcmV0dXJuIGEqYTsgfVxuZnVuY3Rpb24gYmV0d2Vlbih4LCBhLCBiKSB7XG4gIGxldCBsZWZ0ID0gTWF0aC5taW4oYSxiKSxcbiAgICAgIHJpZ2h0ID0gTWF0aC5tYXgoYSxiKTtcbiAgcmV0dXJuIChsZWZ0IDw9IHggJiYgeCA8PSByaWdodClcbn1cblxuLypcbiAgSW50ZXJzZWN0aW9uIG9mIHR3byBvYmplY3RzOyByZXR1cm5zIGFuIGFycmF5LCBwb3NzaWJseSBlbXB0eSwgb2YgXG4gIGludGVyc2VjdGlvbiBwb2ludHMuXG4qL1xuXG4vKipcbiAqIGludGVyc2VjdCAtIEZpbmQgdGhlIGludGVyc2VjdGlvbihzKSBvZiB0aGUgZ2l2ZW4gdHdvIG9iamVjdHMuXG4gKiAgXG4gKiBAcGFyYW0gIHtHZW9tfSBvMSBmaXJzdCBvYmplY3QgXG4gKiBAcGFyYW0gIHtHZW9tfSBvMiBzZWNvbmQgb2JqZWN0IFxuICogQHJldHVybiB7QXJyYXkuPFBvaW50Pn0gICAgUG9pbnRzIG9mIGludGVyc2VjdGlvbiBiZXR3ZWVuIHRoZSB0d28gb2JqZWN0cy4gXG4gKi8gXG5mdW5jdGlvbiBpbnRlcnNlY3QobzEsIG8yKSB7XG4gIGlmKG8xIGluc3RhbmNlb2YgQ2lyY2xlICYmIG8yIGluc3RhbmNlb2YgQ2lyY2xlKSAgICAgICAgLy8gY2lyY2xlLWNpcmNsZVxuICAgIHJldHVybiBpbnRlcnNlY3RDaXJjbGVDaXJjbGUobzEsIG8yKTtcbiAgLy8gaWYgb25seSBvbmUgaXMgYSBjaXJjbGUsIGl0IHNob3VsZCBiZSBmaXJzdC5cbiAgZWxzZSBpZihvMiBpbnN0YW5jZW9mIENpcmNsZSlcbiAgICByZXR1cm4gaW50ZXJzZWN0KG8yLCBvMSk7IFxuICBlbHNlIGlmKG8xIGluc3RhbmNlb2YgQ2lyY2xlICYmIG8yIGluc3RhbmNlb2YgU2VnbWVudCkgIC8vIGNpcmNsZS1zZWdtZW50XG4gICAgcmV0dXJuIGludGVyc2VjdENpcmNsZUxpbmUobzEsIG8yLCB0cnVlKTtcbiAgZWxzZSBpZihvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIExpbmUpICAgICAvLyBjaXJjbGUtbGluZVxuICAgIHJldHVybiBpbnRlcnNlY3RDaXJjbGVMaW5lKG8xLCBvMiwgZmFsc2UpO1xuICBlbHNlIGlmKG8xIGluc3RhbmNlb2YgU2VnbWVudCAmJiBvMiBpbnN0YW5jZW9mIFNlZ21lbnQpIC8vIHNlZ21lbnQtc2VnbWVudFxuICAgIHJldHVybiBpbnRlcnNlY3RMaW5lTGluZShvMSwgbzIsIHRydWUpO1xuICAvLyBpZiBvbmx5IG9uZSBpcyBhIHNlZ21lbnQsIGl0IHNob3VsZCBiZSBmaXJzdC5cbiAgZWxzZSBpZihvMiBpbnN0YW5jZW9mIFNlZ21lbnQpXG4gICAgcmV0dXJuIGludGVyc2VjdChvMiwgbzEpO1xuICBlbHNlIGlmKG8xIGluc3RhbmNlb2YgTGluZSAmJiBvMiBpbnN0YW5jZW9mIExpbmUpICAgICAgIC8vIGxpbmUtbGluZVxuICAgIHJldHVybiBpbnRlcnNlY3RMaW5lTGluZShvMSwgbzIsIGZhbHNlKTtcblxuICAvLyBUT0RPOiBjaXJjbGUtcG9pbnQsIHNlZ21lbnQtcG9pbnQsIHBvaW50LXBvaW50XG4gIGVsc2UgaWYobzIgaW5zdGFuY2VvZiBQb2ludCB8fCBvMSBpbnN0YW5jZW9mIFBvaW50KVxuICAgIHJldHVybiBbXTtcbiAgICBcbiAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnRlcnNlY3QgJyArIFxuICAgIG8xLmNvbnN0cnVjdG9yLm5hbWUgKyAnIGFuZCAnICsgbzIuY29uc3RydWN0b3IubmFtZSk7XG4gIFxufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RDaXJjbGVDaXJjbGUoYzEsIGMyKSB7XG4gIGxldCBkc3EgPSBkZChjMS5jZW50ZXIsIGMyLmNlbnRlcik7XG4gIGxldCBkID0gTWF0aC5zcXJ0KGRzcSk7XG4gIFxuICBpZihkID4gYzEucmFkaXVzICsgYzIucmFkaXVzKSB7IHJldHVybiBbXTsgfVxuICBlbHNlIGlmKGQgPCBjMS5yYWRpdXMgLSBjMi5yYWRpdXMpIHsgcmV0dXJuIFtdOyB9XG4gIGVsc2UgaWYoZHNxID09PSAwKSB7IHJldHVybiBbXTsgfVxuICAgIFxuICBsZXQgYSA9IChjMS5yYWRpdXNzcSAtIGMyLnJhZGl1c3NxICsgZHNxKSAvICgyKmQpO1xuICBsZXQgaCA9IE1hdGguc3FydChNYXRoLm1heChjMS5yYWRpdXNzcSAtIHNxKGEpLCAwKSk7XG4gIGxldCBjeCA9IGMxLmNlbnRlci54ICsgYSooYzIuY2VudGVyLnggLSBjMS5jZW50ZXIueCkvZDtcbiAgbGV0IGN5ID0gYzEuY2VudGVyLnkgKyBhKihjMi5jZW50ZXIueSAtIGMxLmNlbnRlci55KS9kO1xuICBcbiAgbGV0IG54ID0gaCAqIChjMS5jZW50ZXIueSAtIGMyLmNlbnRlci55KS9kO1xuICBsZXQgbnkgPSBoICogKGMxLmNlbnRlci54IC0gYzIuY2VudGVyLngpL2Q7XG4gIFxuICByZXR1cm4gdW5pcShbUCgwLCBjeCtueCwgY3ktbnkpLCBQKDEsIGN4LW54LCBjeStueSldLCBjb21wYXJlUG9pbnRzKTtcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0TGluZUxpbmUoczEsIHMyLCBjbGlwKSB7XG4gIGxldCBbe3g6eDEsIHk6eTF9LCB7eDp4MiwgeTp5Mn1dID0gczEuX3A7XG4gIGxldCBbe3g6eDMsIHk6eTN9LCB7eDp4NCwgeTp5NH1dID0gczIuX3A7XG4gIGxldCBzID0gKC1zMS5keSAqICh4MSAtIHgzKSArIHMxLmR4ICogKHkxIC0geTMpKSAvICgtczIuZHggKiBzMS5keSArIHMxLmR4ICogczIuZHkpXG4gIGxldCB0ID0gKHMyLmR4ICogKHkxIC0geTMpIC0gczIuZHkgKiAoeDEgLSB4MykpIC8gKC1zMi5keCAqIHMxLmR5ICsgczEuZHggKiBzMi5keSlcbiAgXG4gIGlmKCFjbGlwIHx8IChiZXR3ZWVuKHMsMCwxKSAmJiBiZXR3ZWVuKHQsMCwxKSkpXG4gICAgcmV0dXJuIFtQKDAsIHgxICsgdCpzMS5keCwgeTEgKyB0KnMxLmR5KV1cbiAgZWxzZVxuICAgIHJldHVybiBbXTsgLy8gbm8gY29sbGlzaW9uXG59XG5cbi8qIGh0dHA6Ly9tYXRod29ybGQud29sZnJhbS5jb20vQ2lyY2xlLUxpbmVJbnRlcnNlY3Rpb24uaHRtbCAqL1xuZnVuY3Rpb24gaW50ZXJzZWN0Q2lyY2xlTGluZShjLCBzLCBjbGlwKSB7XG4gIGxldCBbe3g6eDEsIHk6eTF9LCB7eDp4MiwgeTp5Mn1dID0gcy5fcDtcbiAgbGV0IHt4OngwLCB5OnkwfSA9IGMuY2VudGVyO1xuXG4gIC8vIG5vdGUgdGhlIHRyYW5zbGF0aW9uICh4MCwgeTApLT4oMCwwKS5cbiAgbGV0IEQgPSAoeDEteDApKih5Mi15MCkgLSAoeDIteDApKih5MS15MCk7XG4gIGxldCBEc3EgPSBzcShEKTtcbiAgICBcbiAgbGV0IGxlbnNxID0gc3Eocy5keCkrc3Eocy5keSk7XG4gIGxldCBkaXNjID0gTWF0aC5zcXJ0KHNxKGMucmFkaXVzKSpsZW5zcSAtIERzcSk7XG4gIGlmKGRpc2MgPCAwKSB7IHJldHVybiBbXTsgfVxuXG4gIGxldCBjeCA9IEQqcy5keSAvIGxlbnNxLCBjeSA9IC1EKnMuZHggLyBsZW5zcTtcbiAgbGV0IG54ID0gKHMuZHkgPCAwID8gLTEqcy5keCA6IHMuZHgpICogZGlzYyAvIGxlbnNxLFxuICAgICAgbnkgPSBNYXRoLmFicyhzLmR5KSAqIGRpc2MgLyBsZW5zcTtcblxuICAvLyB0cmFuc2xhdGUgKDAsMCktPih4MCwgeTApLlxuICByZXR1cm4gdW5pcShbUCgwLCBjeCArIG54ICsgeDAsIGN5ICsgbnkgKyB5MCksIFxuICAgICAgICAgICAgICAgUCgxLCBjeCAtIG54ICsgeDAsIGN5IC0gbnkgKyB5MCldLCBjb21wYXJlUG9pbnRzKVxuICAgICAgICAuZmlsdGVyKHAgPT4gKGNsaXAgPyBiZXR3ZWVuKHAueCx4MSx4MikgJiYgYmV0d2VlbihwLnkseTEseTIpIDogdHJ1ZSkpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbnRlcnNlY3QsXG4gIGludGVyc2VjdENpcmNsZUNpcmNsZSxcbiAgaW50ZXJzZWN0Q2lyY2xlTGluZSxcbiAgaW50ZXJzZWN0TGluZUxpbmV9XG4gIFxuIiwibGV0IEdlb20gPSByZXF1aXJlKCcuL2dlb20nKSxcbiAgICBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQnKSxcbiAgICBTZWdtZW50ID0gcmVxdWlyZSgnLi9zZWdtZW50JyksXG4gICAge2Rpc3RhbmNlLCBkaXN0YW5jZVNxdWFyZWR9ID0gcmVxdWlyZSgnLi4vY2FsYycpO1xuXG5jbGFzcyBDaXJjbGUgZXh0ZW5kcyBHZW9tIHtcbiAgXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNlbnRlciwgYSkge1xuICAgIGlmKHR5cGVvZiBhID09PSAndW5kZWZpbmVkJykge1xuICAgICAgYSA9IGNlbnRlcjtcbiAgICAgIGNlbnRlciA9IG5hbWU7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgXG4gICAgc3VwZXIobmFtZSk7XG4gICAgdGhpcy5jZW50ZXIgPSBjZW50ZXI7XG4gICAgaWYgKGEgaW5zdGFuY2VvZiBQb2ludCkge1xuICAgICAgdGhpcy5fZnJvbUNlbnRlckFuZEJvdW5kYXJ5UG9pbnQoY2VudGVyLCBhKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhID09PSAnbnVtYmVyJykge1xuICAgICAgdGhpcy5fZnJvbUNlbnRlckFuZFJhZGl1cyhjZW50ZXIsIGEpO1xuICAgIH1cbiAgfVxuICBcbiAgX2Zyb21DZW50ZXJBbmRSYWRpdXMoY2VudGVyLCByYWRpdXMpIHtcbiAgICB0aGlzLnJhZGl1cyA9IHJhZGl1cztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICByYWRpdXNzcToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmFkaXVzICogdGhpcy5yYWRpdXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBcbiAgX2Zyb21DZW50ZXJBbmRCb3VuZGFyeVBvaW50KGNlbnRlciwgYm91bmRhcnlQb2ludCkge1xuICAgIHRoaXMuYm91bmRhcnlQb2ludCA9IGJvdW5kYXJ5UG9pbnQ7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgcmFkaXVzOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gZGlzdGFuY2UodGhpcy5ib3VuZGFyeVBvaW50LCB0aGlzLmNlbnRlcik7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICByYWRpdXNzcToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGRpc3RhbmNlU3F1YXJlZCh0aGlzLmJvdW5kYXJ5UG9pbnQsIHRoaXMuY2VudGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cbiAgXG4gIHkoeCkge1xuICAgIHZhciB3ID0gTWF0aC5hYnMoeCAtIHRoaXMuY2VudGVyLngpO1xuICAgIGlmICh3ID4gdGhpcy5yYWRpdXMpIHJldHVybiBudWxsO1xuICAgIGlmICh3ID09PSB0aGlzLnJhZGl1cykgcmV0dXJuIG5ldyBQb2ludCh4LCB0aGlzLmNlbnRlci55KTtcbiAgICBcbiAgICB2YXIgaCA9IE1hdGguc3FydCh0aGlzLnJhZGl1cyAqIHRoaXMucmFkaXVzIC0gdyAqIHcpO1xuICAgIHJldHVybiBbdGhpcy5jZW50ZXIueSArIGgsIHRoaXMuY2VudGVyLnkgLSBoXTtcbiAgfVxuICBcbiAgY29udGFpbnMocCkge1xuICAgIHJldHVybiBkaXN0YW5jZVNxdWFyZWQocCwgdGhpcy5jZW50ZXIpID09PSB0aGlzLnJhZGl1c3NxO1xuICB9XG4gIFxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJ0NpcmNsZScgKyBzdXBlci50b1N0cmluZygpICsgJ1snICsgdGhpcy5jZW50ZXIudG9TdHJpbmcoKSArICc7JyArIHRoaXMucmFkaXVzICsgJ10nO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2lyY2xlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBHZW9tIHtcbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gIH1cbiAgXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm5hbWU7XG4gIH1cbn1cbiIsIlxubGV0IFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludCcpLFxuICAgIENpcmNsZSA9IHJlcXVpcmUoJy4vY2lyY2xlJyksXG4gICAgTGluZSA9IHJlcXVpcmUoJy4vbGluZScpLFxuICAgIFNlZ21lbnQgPSByZXF1aXJlKCcuL3NlZ21lbnQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFA6IFBvaW50LlAsXG4gIFBvaW50LFxuICBDaXJjbGUsXG4gIFNlZ21lbnQsXG4gIExpbmUsXG4gIGVxdWFsV2l0aGluXG59O1xuXG5cbi8qIHJldHVybiBhIGRlZXAtZXF1YWxpdHkgdGVzdCBmdW5jdGlvbiB0aGF0IGNoZWNrcyBmb3IgZ2VvbWV0cmljIG9iamVjdFxuICAgZXF1YWxpdHkgdXNpbmcgdGhlIGdpdmVuIGRpc3RhbmNlIHRocmVzaG9sZCBmb3IgcG9pbnQgZXF1YWxpdHk7IGkuZS4sIGlmIFxuICAgdHdvIHBvaW50cyBhcmUgY2xvc2VyIHRoYW4gYHRocmVzaG9sZGAsIGNvbnNpZGVyIHRoZW0gZXF1YWwuICovXG5mdW5jdGlvbiBlcXVhbFdpdGhpbih0aHJlc2hvbGQpIHtcbiAgdGhyZXNob2xkID0gdGhyZXNob2xkIHx8IDA7XG4gIHJldHVybiBmdW5jdGlvbiBlcXVhbChvMSwgbzIpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvMSkgJiYgQXJyYXkuaXNBcnJheShvMikpIHtcbiAgICAgIHJldHVybiBvMS5ldmVyeSgob2JqLCBpbmRleCkgPT4gZXF1YWwob2JqLCBvMltpbmRleF0pKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIG8xID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgbzIgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gTWF0aC5hYnMobzEgLSBvMikgPCB0aHJlc2hvbGQ7XG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIFBvaW50ICYmIG8yIGluc3RhbmNlb2YgUG9pbnQpIHtcbiAgICAgIGlmKG8xLnggPT09IG51bGwgfHwgbzIueCA9PT0gbnVsbCB8fCBvMS55ID09PSBudWxsIHx8IG8yLnkgPT09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGVxdWFsKE1hdGguYWJzKG8xLnggLSBvMi54KSArIE1hdGguYWJzKG8xLnkgLSBvMi55KSwgMCk7XG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIENpcmNsZSAmJiBvMiBpbnN0YW5jZW9mIENpcmNsZSkge1xuICAgICAgcmV0dXJuIGVxdWFsKG8xLnJhZGl1cywgbzIucmFkaXVzKSAmJiBlcXVhbChvMS5jZW50ZXIsIG8yLmNlbnRlcik7XG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIFNlZ21lbnQgJiYgbzIgaW5zdGFuY2VvZiBTZWdtZW50KSB7XG4gICAgICB2YXIgcDEgPSBbXS5jb25jYXQobzEucCksXG4gICAgICAgICAgcDIgPSBbXS5jb25jYXQobzIucClcbiAgICAgIC8vIGVuc3VyZSBwb2ludHMgZnJvbSBib3RoIHNlZ21lbnRzIGFyZSBpbiB0aGUgc2FtZSBvcmRlciBcbiAgICAgIC8vIChsZWZ0IHRvIHJpZ2h0IG9yIHJpZ2h0IHRvIGxlZnQpLlxuICAgICAgaWYocDFbMF0ueCA+IHAxWzFdLnggJiYgcDJbMF0ueCA8IHAyWzBdLngpIHAxLnJldmVyc2UoKTtcbiAgICAgIC8vIHRoZW4gZGVsZWdhdGUgdG8gcG9pbnQgZXF1YWxpdHlcbiAgICAgIHJldHVybiBlcXVhbChwMSwgcDIpXG4gICAgfVxuICAgIGlmIChvMSBpbnN0YW5jZW9mIExpbmUgJiYgbzIgaW5zdGFuY2VvZiBMaW5lKSB7XG4gICAgICByZXR1cm4gZXF1YWwobzEubSwgbzIubSkgJiYgZXF1YWwobzEueSgwKSwgbzIueSgwKSkgJiYgZXF1YWwobzEueCgwKSwgbzIueCgwKSk7XG4gICAgfVxuXG4gICAgLy8gZmFsbGJhY2sgdG8gb2JqZWN0IGVxdWFsaXR5XG4gICAgcmV0dXJuIG8xID09PSBvMjtcbiAgfVxufVxuIiwiXG5sZXQgR2VvbSA9IHJlcXVpcmUoJy4vZ2VvbScpLFxuICAgIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludCcpLFxuICAgIHtpbnRlcnNlY3R9ID0gcmVxdWlyZSgnLi4vaW50ZXJzZWN0aW9uJyk7XG5cbm1vZHVsZS5leHBvcnRzPVxuY2xhc3MgSW50ZXJzZWN0aW9uIGV4dGVuZHMgUG9pbnQge1xuICBcbiAgXG4gIC8qKiAgXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7Li4uR2VvbX0gb2JqZWN0cyB0byBiZSBpbnRlcnNlY3RlZFxuICAgKiBAcGFyYW0ge251bWJlcnxHZW9tfmJvb2xlYW59IFt3aGljaF0gb3B0aW9uYWwgYXJyYXkgaW5kZXggb3IgZmlsdGVyIGNhbGxiYWNrIGluIGNhc2UgdGhlcmUgYXJlIG11bHRpcGxlIGludGVyc2VjdGlvbnMuXG4gICAqLyAgIFxuICBjb25zdHJ1Y3RvcihuYW1lLCAuLi5vYmplY3RzKSB7XG4gICAgaWYobmFtZSBpbnN0YW5jZW9mIEdlb20pIHtcbiAgICAgIG9iamVjdHMuc2hpZnQobmFtZSk7XG4gICAgICBuYW1lID0gbnVsbDtcbiAgICB9XG4gICAgc3VwZXIobmFtZSwgbnVsbCwgbnVsbCk7XG4gICAgXG4gICAgdGhpcy53aGljaCA9IC9mdW5jdGlvbnxudW1iZXIvLnRlc3QodHlwZW9mIG9iamVjdHNbb2JqZWN0cy5sZW5ndGggLSAxXSkgP1xuICAgICAgb2JqZWN0cy5wb3AoKSA6IDA7XG4gICAgdGhpcy5vYmplY3RzID0gb2JqZWN0cztcbiAgICB0aGlzLmZyZWUgPSBmYWxzZTtcbiAgfVxuICBcbiAgdXBkYXRlKCkge1xuICAgIGxldCByZXN1bHQgPSBpbnRlcnNlY3QuYXBwbHkobnVsbCwgdGhpcy5vYmplY3RzKTtcbiAgICBpZih0eXBlb2YgdGhpcy53aGljaCA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5maWx0ZXIodGhpcy53aGljaClbMF07XG4gICAgZWxzZVxuICAgICAgcmVzdWx0ID0gcmVzdWx0W3RoaXMud2hpY2hdO1xuICAgICAgXG4gICAgaWYocmVzdWx0KSB7XG4gICAgICAoe3g6IHRoaXMueCwgeTogdGhpcy55fSA9IHJlc3VsdCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy54ID0gdGhpcy55ID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgXG4gIHRvU3RyaW5nKHZlcmJvc2UpIHtcbiAgICBsZXQgcHN0ciA9IHN1cGVyLnRvU3RyaW5nKCk7XG4gICAgcmV0dXJuICghdmVyYm9zZSkgPyBwc3RyIDpcbiAgICBwc3RyICsgJzsgaW50ZXJzZWN0aW9uIG9mOiAnICsgdGhpcy5vYmplY3RzLm1hcChvID0+IG8udG9TdHJpbmcoKSkuam9pbignLCcpO1xuICB9XG59XG4iLCJcbmxldCBHZW9tID0gcmVxdWlyZSgnLi9nZW9tJyk7XG5cbmNsYXNzIExpbmUgZXh0ZW5kcyBHZW9tIHtcbiAgY29uc3RydWN0b3IobmFtZSwgcDEsIHAyKSB7XG4gICAgaWYodHlwZW9mIHAyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcDIgPSBwMTtcbiAgICAgIHAxID0gbmFtZTtcbiAgICAgIG5hbWUgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICBzdXBlcihuYW1lKTtcbiAgICBpZiAoIXAyKSB7XG4gICAgICB0aGlzLl9wID0gcDEuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcCA9IFtwMSwgcDJdO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLl9jbGlwID0gZmFsc2U7XG4gICAgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgICAgLy8gVE9ETzogSSBkb24ndCBsaWtlIGR4IGFuZCBkeSBvbiB0aGUgbGluZSBjbGFzcy4uLlxuICAgICAgZHg6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl9wWzFdLnggLSB0aGlzLl9wWzBdLng7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBkeToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3BbMV0ueSAtIHRoaXMuX3BbMF0ueTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRoZXRhOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLmR5LCB0aGlzLmR4KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG06IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIGlmICh0aGlzLmR4ID09PSAwKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICBlbHNlIHJldHVybiB0aGlzLmR5IC8gdGhpcy5keDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgbGVmdDoge1xuICAgICAgICBnZXQoKSB7IHJldHVybiB0aGlzLl9jbGlwID8gTWF0aC5taW4odGhpcy5fcFswXS54LCB0aGlzLl9wWzFdLngpIDogbnVsbDsgfVxuICAgICAgfSxcbiAgICAgIHJpZ2h0OiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1heCh0aGlzLl9wWzBdLngsIHRoaXMuX3BbMV0ueCkgOiBudWxsOyB9XG4gICAgICB9LFxuICAgICAgdG9wOiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1pbih0aGlzLl9wWzBdLnksIHRoaXMuX3BbMV0ueSkgOiBudWxsOyB9XG4gICAgICB9LFxuICAgICAgYm90dG9tOiB7XG4gICAgICAgIGdldCgpIHsgcmV0dXJuIHRoaXMuX2NsaXAgPyBNYXRoLm1heCh0aGlzLl9wWzBdLnksIHRoaXMuX3BbMV0ueSkgOiBudWxsOyB9XG4gICAgICB9XG4gICAgICBcbiAgICB9KVxuICB9XG4gIFxuICB5KHgpIHtcbiAgICBpZiAoKHRoaXMuZHggPT09IDApIHx8ICh0aGlzLl9jbGlwICYmICh0aGlzLmxlZnQgPiB4IHx8IHRoaXMucmlnaHQgPCB4KSkpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBlbHNlIFxuICAgICAgcmV0dXJuIHRoaXMuX3BbMF0ueSArICh4IC0gdGhpcy5fcFswXS54KSAqICh0aGlzLmR5KSAvICh0aGlzLmR4KVxuICB9XG5cbiAgeCh5KSB7XG4gICAgaWYgKCh0aGlzLmR5ID09PSAwKSB8fCAodGhpcy5fY2xpcCAmJiAodGhpcy50b3AgPiB5IHx8IHRoaXMuYm90dG9tIDwgeSkpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZWxzZSBcbiAgICAgIHJldHVybiB0aGlzLl9wWzBdLnggKyAoeSAtIHRoaXMuX3BbMF0ueSkgKiAodGhpcy5keCkgLyAodGhpcy5keSlcbiAgfVxuICBcbiAgY29udGFpbnMocCkge1xuICAgIGxldCBvbkxpbmUgPSAodGhpcy5keCAhPT0gMCkgPyAodGhpcy55KHAueCkgPT09IHAueSkgOiAodGhpcy54KHAueSkgPT09IHAueCk7XG4gICAgcmV0dXJuIG9uTGluZSAmJiAoIXRoaXMuX2NsaXAgfHwgXG4gICAgICAoKHRoaXMubGVmdCA8PSBwLnggJiYgcC54IDw9IHRoaXMucmlnaHQpICYmXG4gICAgICAodGhpcy50b3AgPD0gcC55ICYmIHAueSA8PSB0aGlzLmJvdHRvbSkpKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnTGluZScgKyBzdXBlci50b1N0cmluZygpICsgJ1snICtcbiAgICAgIHRoaXMuX3BbMF0udG9TdHJpbmcoKSArICc7JyArIHRoaXMuX3BbMV0udG9TdHJpbmcoKSArXG4gICAgICAnXSc7XG4gIH1cbn1cbiAgICAgICAgXG5tb2R1bGUuZXhwb3J0cyA9IExpbmU7XG4iLCJsZXQgR2VvbSA9IHJlcXVpcmUoJy4vZ2VvbScpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUG9pbnQgZXh0ZW5kcyBHZW9tIHtcbiAgY29uc3RydWN0b3IobmFtZSwgeCwgeSkge1xuICAgIGlmKHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgeSA9IHg7XG4gICAgICB4ID0gbmFtZTtcbiAgICAgIG5hbWUgPSBudWxsO1xuICAgIH1cbiAgICBzdXBlcihuYW1lKTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5mcmVlID0gdHJ1ZTtcbiAgfVxuICBcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHN1cGVyLnRvU3RyaW5nKCkgKyAnKCcgKyB0aGlzLnggKyAnLCcgKyB0aGlzLnkgKyAnKSc7XG4gIH1cbiAgXG4gIC8qIHNob3J0aGFuZCBmdW5jdGlvbiBmb3IgY29uc3RydWN0aW5nIGEgcG9pbnQgZnJvbSBjb29kaW5hdGVzICovXG4gIHN0YXRpYyBQKG5hbWUsIHgsIHkpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KG5hbWUsIHgsIHkpO1xuICB9XG59XG4iLCJsZXQgUCA9IHJlcXVpcmUoJy4vcG9pbnQnKS5QLFxuICAgIExpbmUgPSByZXF1aXJlKCcuL2xpbmUnKSxcbiAgICB7ZGlzdGFuY2VTcXVhcmVkLCBkaXN0YW5jZX0gPSByZXF1aXJlKCcuLi9jYWxjJyk7XG5cbmNsYXNzIFNlZ21lbnQgZXh0ZW5kcyBMaW5lIHtcbiAgY29uc3RydWN0b3IobmFtZSwgcDEsIHAyKSB7XG4gICAgc3VwZXIobmFtZSwgcDEsIHAyKTtcbiAgICB0aGlzLl9jbGlwID0gdHJ1ZTtcbiAgICBcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICBwOiB7XG4gICAgICAgIC8vIFRPRE86IGNsb25lIHBvaW50IHRoZW1zZWx2ZXM/XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gW10uY29uY2F0KHRoaXMuX3ApO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXG4gICAgICBsZW5ndGhzcToge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGRpc3RhbmNlU3F1YXJlZCh0aGlzLl9wWzBdLCB0aGlzLl9wWzFdKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgbGVuZ3RoOiB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gZGlzdGFuY2UodGhpcy5fcFswXSwgdGhpcy5fcFsxXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG4gIFxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJ1NlZ21lbnQnICsgc3VwZXIudG9TdHJpbmcoKTtcbiAgfVxuICBcbiAgLypcbiAgY2xpcCB0aGUgZ2l2ZW4gbGluZSAob3IgbGluZSBzZWdtZW50KSB0byB0aGUgZ2l2ZW4gYm91bmRpbmcgYm94LCB3aGVyZSBgYm91bmRzYFxuICBtdXN0IGhhdmUgYGxlZnRgLCBgcmlnaHRgLCBgdG9wYCwgYW5kIGBib3R0b21gIHByb3BlcnRpZXMuXG4gICovXG4gIHN0YXRpYyBjbGlwKGJvdW5kcywgbGluZSkge1xuICAgIHZhciBbcDEsIHAyXSA9IGxpbmUuX3A7XG4gICAgXG4gICAgdmFyIGxlZnQgPSBsaW5lLnkoYm91bmRzLmxlZnQpLFxuICAgIHJpZ2h0ID0gbGluZS55KGJvdW5kcy5yaWdodCksXG4gICAgdG9wID0gbGluZS54KGJvdW5kcy50b3ApLFxuICAgIGJvdHRvbSA9IGxpbmUueChib3VuZHMuYm90dG9tKTtcbiAgICBcbiAgICBpZiAocDEueCA+IHAyLngpIHtcbiAgICAgIGxldCB0ID0gcDE7XG4gICAgICBwMSA9IHAyO1xuICAgICAgcDIgPSB0O1xuICAgIH1cbiAgICBpZiAobGVmdCAmJiBsZWZ0ID49IGJvdW5kcy50b3AgJiYgbGVmdCA8PSBib3VuZHMuYm90dG9tKSB7XG4gICAgICAvLyBpbnRlcnNlY3RzIGxlZnQgd2FsbFxuICAgICAgcDEgPSBQKGJvdW5kcy5sZWZ0LCBsZWZ0KTtcbiAgICB9XG4gICAgaWYgKHJpZ2h0ICYmIHJpZ2h0ID49IGJvdW5kcy50b3AgJiYgcmlnaHQgPD0gYm91bmRzLmJvdHRvbSkge1xuICAgICAgLy8gaW50ZXJzZWN0cyByaWdodCB3YWxsXG4gICAgICBwMiA9IFAoYm91bmRzLnJpZ2h0LCByaWdodCk7XG4gICAgfVxuICAgIFxuICAgIGlmIChwMS55ID4gcDIueSkge1xuICAgICAgbGV0IHQgPSBwMTtcbiAgICAgIHAxID0gcDI7XG4gICAgICBwMiA9IHQ7XG4gICAgfVxuICAgIGlmICh0b3AgJiYgdG9wID49IGJvdW5kcy5sZWZ0ICYmIHRvcCA8PSBib3VuZHMucmlnaHQpIHtcbiAgICAgIC8vIGludGVyc2VjdHMgdG9wIHdhbGxcbiAgICAgIHAxID0gUCh0b3AsIGJvdW5kcy50b3ApO1xuICAgIH1cbiAgICBpZiAoYm90dG9tICYmIGJvdHRvbSA+PSBib3VuZHMubGVmdCAmJiBib3R0b20gPD0gYm91bmRzLnJpZ2h0KSB7XG4gICAgICAvLyBpbnRlcnNlY3RzIGJvdHRvbSB3YWxsXG4gICAgICBwMiA9IFAoYm90dG9tLCBib3VuZHMuYm90dG9tKTtcbiAgICB9XG4gICAgXG4gICAgbGV0IGNsaXBwZWQgPSBuZXcgU2VnbWVudChudWxsLCBwMSwgcDIpO1xuICAgIGNsaXBwZWQucGFyZW50ID0gbGluZTtcbiAgICByZXR1cm4gY2xpcHBlZDtcbiAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gU2VnbWVudDtcbiIsImxldCBwYXJzZXIgPSByZXF1aXJlKCdldWNsaWQtcGFyc2VyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2NlbmUsIHRleHQsIGNiKSB7XG4gIGZ1bmN0aW9uIGVycm9yKGl0ZW0sIG1lc3NhZ2UpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIGlmIChpdGVtLnNvdXJjZSkge1xuICAgICAgZXJyLmxpbmUgPSBpdGVtLnNvdXJjZS5saW5lO1xuICAgICAgZXJyLmNvbHVtbiA9IGl0ZW0uc291cmNlLmNvbHVtbjtcbiAgICAgIGVyci50ZXh0ID0gaXRlbS5zb3VyY2UudGV4dDtcbiAgICB9XG4gICAgdGhyb3cgZXJyO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZShzdGFjaywgaXRlbSkge1xuXG4gICAgaWYgKGl0ZW0ubmFtZSkge1xuICAgICAgaWYgKHNjZW5lLmdldChpdGVtLm5hbWUpKSB7XG4gICAgICAgIHJldHVybiBpdGVtLm5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJvcihpdGVtLCBcIkNvdWxkIG5vdCBmaW5kIFwiICsgaXRlbS5uYW1lKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YWNrLmluZGV4T2YoaXRlbSkgPj0gMCkge1xuICAgICAgICBlcnJvcihpdGVtLCBcIkNpcmN1bGFyIHJlZmVyZW5jZSFcIik7XG4gICAgICB9XG4gICAgICBzdGFjay5wdXNoKGl0ZW0pO1xuICAgICAgcmV0dXJuIHBhcnNlKHN0YWNrLCBpdGVtKTtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlKHN0YWNrLCBpdGVtKSB7XG4gICAgc3dpdGNoIChpdGVtLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2dyb3VwJzpcbiAgICAgICAgc2NlbmUuZ3JvdXAoaXRlbS5uYW1lKTtcbiAgICAgICAgcmV0dXJuIGl0ZW0ubmFtZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwb2ludCc6XG4gICAgICAgIHNjZW5lLnBvaW50KGl0ZW0ubmFtZSwgaXRlbS54LCBpdGVtLnkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2xpbmUnOlxuICAgICAgICBzY2VuZS5saW5lKGl0ZW0ubmFtZSwgcmVzb2x2ZShzdGFjaywgaXRlbS5wb2ludHNbMF0pLCByZXNvbHZlKHN0YWNrLCBpdGVtLnBvaW50c1sxXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlZ21lbnQnOlxuICAgICAgICBzY2VuZS5zZWdtZW50KGl0ZW0ubmFtZSwgcmVzb2x2ZShzdGFjaywgaXRlbS5wb2ludHNbMF0pLCByZXNvbHZlKHN0YWNrLCBpdGVtLnBvaW50c1sxXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICAgIHNjZW5lLmNpcmNsZShpdGVtLm5hbWUsIHJlc29sdmUoc3RhY2ssIGl0ZW0uY2VudGVyKSwgcmVzb2x2ZShzdGFjaywgaXRlbS5ib3VuZGFyeVBvaW50KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnaW50ZXJzZWN0aW9uJzpcbiAgICAgICAgbGV0IHdoaWNoID0gMDtcbiAgICAgICAgaWYgKGl0ZW0ud2hpY2ggJiYgaXRlbS53aGljaC5vcCA9PT0gJ25vdCcpXG4gICAgICAgICAgd2hpY2ggPSBzY2VuZS5pc250KGl0ZW0ud2hpY2guYXJnc1swXSk7XG4gICAgICAgICAgXG4gICAgICAgIHNjZW5lLmludGVyc2VjdGlvbihpdGVtLm5hbWUsXG4gICAgICAgICAgcmVzb2x2ZShzdGFjaywgaXRlbS5vYmplY3RzWzBdKSwgXG4gICAgICAgICAgcmVzb2x2ZShzdGFjaywgaXRlbS5vYmplY3RzWzFdKSwgd2hpY2gpXG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBzY2VuZS5sYXN0KCkubmFtZTtcbiAgfVxuXG4gIGxldCBwYXJzZWRPYmplY3RzID0gW10sXG4gICAgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcblxuICB0cnkge1xuICAgIC8qIHBhcnNlIFwiW2dyb3VwaW5nXVwiIHN0YXRlbWVudHMgZGlyZWN0bHksIGFuZCBnZW9tZXRyeSBkZWNsYXJhdGlvbnMgdXNpbmdcbiAgICAgKiB0aGUgZXVjbGlkLXBhcnNlciBwYXJzZXIuICovXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgbGluZXNbaV0gPSBsaW5lc1tpXS50cmltKCk7XG4gICAgICBpZiAoL15cXFsuKlxcXSQvLnRlc3QobGluZXNbaV0pKVxuICAgICAgICBwYXJzZWRPYmplY3RzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdncm91cCcsXG4gICAgICAgICAgbmFtZTogbGluZXNbaV0uc2xpY2UoMSwgLTEpXG4gICAgICAgIH0pO1xuICAgICAgZWxzZSBpZiAobGluZXNbaV0ubGVuZ3RoID4gMClcbiAgICAgICAgcGFyc2VkT2JqZWN0cy5wdXNoKHBhcnNlci5wYXJzZShsaW5lc1tpXSlbMF0pO1xuICAgIH1cblxuICAgIC8qIHJlbW92ZSBmcm9tIHNjZW5lIGFueSBleGlzdGluZyBvYmplY3RzIHRoYXQgd2VyZW4ndCBkZWNsYXJlZCBpbiB0aGUgcGFyc2VkIHRleHQgKi9cbiAgICBsZXQgcGFyc2VkTmFtZXMgPSBwYXJzZWRPYmplY3RzLm1hcChvID0+IG8ubmFtZSk7XG4gICAgc2NlbmUuX29iamVjdHMua2V5cygpXG4gICAgICAuZmlsdGVyKG5hbWUgPT4gcGFyc2VkTmFtZXMuaW5kZXhPZihuYW1lKSA8IDApXG4gICAgICAuZm9yRWFjaChuYW1lID0+IHNjZW5lLl9vYmplY3RzLnJlbW92ZShuYW1lKSk7XG5cbiAgICAvKiBub3cgaGFuZGxlIHRoZSBhY3R1YWwgcGFyc2VkIG9iamVjdHMgKi9cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZE9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhcnNlKFtdLCBwYXJzZWRPYmplY3RzW2ldKTtcbiAgICB9XG5cbiAgICBpZiAoY2IpIGNiKHRydWUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICBpZiAoY2IpIGNiKG51bGwsIGUpO1xuICB9XG59XG4iLCJcbmxldCBkMyA9IHJlcXVpcmUoJ2QzJylcbmxldCB7IFBvaW50LCBDaXJjbGUsIFNlZ21lbnQsIExpbmUgfSA9IHJlcXVpcmUoJy4vbW9kZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbmRlcmVyO1xuXG5mdW5jdGlvbiByZW5kZXJlcihzY2VuZSwgc3ZnRWxlbWVudCkge1xuICBsZXQgc3ZnID0gZDMuc2VsZWN0KHN2Z0VsZW1lbnQpO1xuXG4gIGZ1bmN0aW9uIHBvaW50KCkge1xuICAgIHRoaXMuYXR0cignY2xhc3MnLCBrbGFzc2VzKCdwb2ludCcpIClcbiAgICAuYXR0cignY3gnLCBkPT5kLngpXG4gICAgLmF0dHIoJ2N5JywgZD0+ZC55KVxuICAgIC5hdHRyKCdyJywgZD0+NSlcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBcbiAgZnVuY3Rpb24ga2xhc3NlcygpIHtcbiAgICBsZXQgaW5pdCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgcmV0dXJuIGQgPT4gaW5pdC5jb25jYXQoZC5jbGFzc2VzID8gZC5jbGFzc2VzLnZhbHVlcygpIDogW10pLmpvaW4oJyAnKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIC8qIGNpcmNsZXMgKi9cbiAgICBsZXQgY2lyY2xlcyA9IHN2Zy5zZWxlY3RBbGwoJ2cuY2lyY2xlJylcbiAgICAuZGF0YShzY2VuZS5vYmplY3RzKCkuZmlsdGVyKGQgPT4gZCBpbnN0YW5jZW9mIENpcmNsZSkpO1xuXG4gICAgbGV0IGNpcmNsZUdyb3VwID0gY2lyY2xlcy5lbnRlcigpLmFwcGVuZCgnZycpXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnY2lyY2xlJykpXG4gICAgLmNhbGwoaG92ZXIpO1xuICAgIGNpcmNsZUdyb3VwLmFwcGVuZCgnY2lyY2xlJykuYXR0cignY2xhc3MnLCAnaGFuZGxlJyk7XG4gICAgY2lyY2xlR3JvdXAuYXBwZW5kKCdjaXJjbGUnKS5hdHRyKCdjbGFzcycsICd2aXNpYmxlJyk7XG5cbiAgICBjaXJjbGVzXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnY2lyY2xlJykpXG4gICAgLnNlbGVjdEFsbCgnY2lyY2xlJylcbiAgICAuYXR0cignY3gnLCBkID0+IGQuY2VudGVyLngpXG4gICAgLmF0dHIoJ2N5JywgZCA9PiBkLmNlbnRlci55KVxuICAgIC5hdHRyKCdyJywgZCA9PiBkLnJhZGl1cylcbiAgICBcbiAgICBjaXJjbGVzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICBcbiAgICAvKiBsaW5lcyAqL1xuICAgIGxldCBsaW5lcyA9IHN2Zy5zZWxlY3RBbGwoJ2cubGluZScpXG4gICAgLmRhdGEoc2NlbmUub2JqZWN0cygpLmZpbHRlcihkPT5kIGluc3RhbmNlb2YgTGluZSkpO1xuICAgIFxuICAgIGxldCBsaW5lR3JvdXAgPSBsaW5lcy5lbnRlcigpLmFwcGVuZCgnZycpXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnbGluZScpKVxuICAgIC5jYWxsKGhvdmVyKTtcbiAgICBsaW5lR3JvdXAuZmlsdGVyKGQ9PmQgaW5zdGFuY2VvZiBTZWdtZW50KVxuICAgIC5hdHRyKCdjbGFzcycsIGtsYXNzZXMoJ2xpbmUnLCAnc2VnbWVudCcpKVxuICAgIGxpbmVHcm91cC5hcHBlbmQoJ2xpbmUnKS5hdHRyKCdjbGFzcycsICdoYW5kbGUnKTtcbiAgICBsaW5lR3JvdXAuYXBwZW5kKCdsaW5lJykuYXR0cignY2xhc3MnLCAndmlzaWJsZScpO1xuICAgIFxuICAgIC8vIFRPRE86IHRoaXMgaXMgZ3Jvc3NseSBpbmVmZmljaWVudFxuICAgIGZ1bmN0aW9uIGVuZHBvaW50KGluZGV4LCBjb29yZCkge1xuICAgICAgcmV0dXJuIGQ9PntcbiAgICAgICAgbGV0IHMgPSBkIGluc3RhbmNlb2YgU2VnbWVudCA/IGQgOiBTZWdtZW50LmNsaXAoc2NlbmUuYm91bmRzLCBkKTtcbiAgICAgICAgcmV0dXJuIHMucFtpbmRleF1bY29vcmRdO1xuICAgICAgfVxuICAgIH1cbiAgICAgIFxuICAgIGxpbmVzXG4gICAgLmF0dHIoJ2NsYXNzJywga2xhc3NlcygnbGluZScpKVxuICAgIC5zZWxlY3RBbGwoJ2xpbmUnKVxuICAgIC5hdHRyKCd4MScsIGVuZHBvaW50KDAsJ3gnKSlcbiAgICAuYXR0cigneTEnLCBlbmRwb2ludCgwLCd5JykpXG4gICAgLmF0dHIoJ3gyJywgZW5kcG9pbnQoMSwneCcpKVxuICAgIC5hdHRyKCd5MicsIGVuZHBvaW50KDEsJ3knKSlcbiAgICBcbiAgICBsaW5lcy5leGl0KCkucmVtb3ZlKCk7XG4gICAgXG4gICAgLyogcG9pbnRzICovXG4gICAgbGV0IHBvaW50cyA9IHN2Zy5zZWxlY3RBbGwoJ2NpcmNsZS5wb2ludCcpXG4gICAgLmRhdGEoc2NlbmUub2JqZWN0cygpLmZpbHRlcihkPT5kIGluc3RhbmNlb2YgUG9pbnQpKVxuICAgIC5zb3J0KChhLGIpPT4oYS5mcmVlID8gMSA6IDApIC0gKGIuZnJlZSA/IDEgOiAwKSlcbiAgICBwb2ludHMuZW50ZXIoKS5hcHBlbmQoJ2NpcmNsZScpXG4gICAgcG9pbnRzLmNhbGwocG9pbnQpXG4gICAgLmNhbGwoaG92ZXIpO1xuICAgIFxuICAgIHBvaW50cy5leGl0KCkucmVtb3ZlKCk7XG4gICAgXG5cbiAgICAvKiBhdHRhY2ggXCJhY3RpdmVcIiBjbGFzcyBvbiBob3ZlciAqL1xuICAgIGZ1bmN0aW9uIG1vdXNlb3ZlcigpIHsgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2FjdGl2ZScsIHRydWUpOyB9XG4gICAgZnVuY3Rpb24gbW91c2VvdXQoKSB7IGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdhY3RpdmUnLCBmYWxzZSk7IH1cbiAgICBmdW5jdGlvbiBob3ZlcigpIHtcbiAgICAgIHRoaXMub24oJ21vdXNlb3ZlcicsIG1vdXNlb3Zlcikub24oJ21vdXNlb3V0JywgbW91c2VvdXQpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSAgICBcbiAgfVxuXG4gIHJldHVybiByZW5kZXI7XG59XG4iLCJcbmxldCBkMyA9IHJlcXVpcmUoJ2QzJyksIC8vIFRPRE86IHJlbW92ZSBkZXA7IG9ubHkgYmVpbmcgdXNlZCBmb3IgZDMubWFwKCkgYW5kIGQzLnNldCgpLlxuICAgIHtcbiAgICAgIFBvaW50LFxuICAgICAgTGluZSxcbiAgICAgIFNlZ21lbnQsXG4gICAgICBDaXJjbGUsXG4gICAgICBlcXVhbFdpdGhpblxuICAgIH0gPSByZXF1aXJlKCcuL21vZGVsJyksXG4gICAgSW50ZXJzZWN0aW9uID0gcmVxdWlyZSgnLi9tb2RlbC9pbnRlcnNlY3Rpb24nKTtcblxuXG5mdW5jdGlvbiBhZGRDbGFzcyhvYmosIGtsYXNzKSB7XG4gIG9iai5jbGFzc2VzID0gb2JqLmNsYXNzZXMgfHwgZDMuc2V0KCk7XG4gIG9iai5jbGFzc2VzLmFkZChrbGFzcyk7XG59XG5cbmNsYXNzIFNjZW5lIHtcbiAgXG4gIGNvbnN0cnVjdG9yKGJvdW5kcykge1xuICAgIHRoaXMuYm91bmRzID0gYm91bmRzO1xuICAgIHRoaXMuYm91bmRzLndpZHRoID0gdGhpcy5ib3VuZHMucmlnaHQgLSB0aGlzLmJvdW5kcy5sZWZ0O1xuICAgIHRoaXMuYm91bmRzLmhlaWdodCA9IHRoaXMuYm91bmRzLmJvdHRvbSAtIHRoaXMuYm91bmRzLnRvcDtcblxuICAgIHRoaXMuX2xhc3QgPSBudWxsOyAvLyBoYWNrIC0tIHNob3VsZCBiZSBrZWVwaW5nIG9iamVjdHMgaW4gb3JkZXJlZCBzdHJ1Y3R1cmUgYW55d2F5LlxuICAgIHRoaXMuX29iamVjdHMgPSBkMy5tYXAoKTtcbiAgICB0aGlzLmVxdWFsID0gZXF1YWxXaXRoaW4oTWF0aC5zcXJ0KDIpKTtcbiAgICB0aGlzLmxvZyA9IFtdO1xuICB9XG4gIFxuICAvKiByZXR1cm4gYW4gYXJyYXkgb2YgYWxsIFBvaW50cyBpbiB0aGUgc2NlbmUgKi9cbiAgcG9pbnRzKCkge1xuICAgIHJldHVybiB0aGlzLl9vYmplY3RzLnZhbHVlcygpLmZpbHRlcihvID0+IG8gaW5zdGFuY2VvZiBQb2ludClcbiAgfVxuICBcbiAgLyogcmV0dXJuIGFuIGFycmF5IG9mIGFsbCBvYmplY3RzIGluIHRoZSBzY2VuZSAqL1xuICBvYmplY3RzKCkge1xuICAgIHJldHVybiB0aGlzLl9vYmplY3RzLnZhbHVlcygpO1xuICB9XG4gIFxuICAvKiBmaW5kIHRoZSBnaXZlbiBvYmplY3QgaXMgaW4gdGhlIHNjZW5lIHVzaW5nIGdlb21ldHJpY1xuICAoaS5lLiBkZWVwKSBlcXVhbGl0eSByYXRoZXIgdGhhbiByZWZlcmVuY2UgPT09LiAqL1xuICBmaW5kKG9iaikge1xuICAgIGxldCBvYmplY3RzID0gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYodGhpcy5lcXVhbChvYmplY3RzW2ldLCBvYmopKSByZXR1cm4gb2JqZWN0c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgXG4gIC8qKiAgXG4gICAqIGlzIC0gR2V0IGFuIGVxdWFsaXR5LXRlc3RpbmcgY2FsbGJhY2sgZm9yIHRoZSBnaXZlbiBvYmplY3QuICBcbiAgICogICAgXG4gICAqIEBwYXJhbSAge0dlb218c3RyaW5nfSBvYmogRWl0aGVyIHRoZSBuYW1lIG9mIHRoZSBvYmplY3QgdG8gdGVzdCBvciB0aGUgb2JqZWN0IGl0c2VsZi5cbiAgICogQHJldHVybiB7R2VvbX5ib29sZWFufSBhIGZ1bmN0aW9uIHRoYXQgdGVzdHMgd2hldGhlciBpdHMgYXJndW1lbnQgaXMgZ2VvbWV0cmljYWxseSBlcXVhbCB0byBvYmouXG4gICAqLyAgIFxuICBpcyhvYmopIHtcbiAgICBpZih0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykgeyBvYmogPSB0aGlzLmdldChvYmopOyB9XG4gICAgcmV0dXJuIChzZWNvbmRPYmopID0+IChvYmogJiYgdGhpcy5lcXVhbChvYmosIHNlY29uZE9iaikpO1xuICB9XG4gIFxuICAvKiogIFxuICAqIGlzIC0gR2V0IGFuIE5PTi1lcXVhbGl0eS10ZXN0aW5nIGNhbGxiYWNrIGZvciB0aGUgZ2l2ZW4gb2JqZWN0LiAgXG4gICogICAgXG4gICogQHBhcmFtICB7R2VvbXxzdHJpbmd9IG9iaiBFaXRoZXIgdGhlIG5hbWUgb2YgdGhlIG9iamVjdCB0byB0ZXN0IG9yIHRoZSBvYmplY3QgaXRzZWxmLlxuICAqIEByZXR1cm4ge0dlb21+Ym9vbGVhbn0gYSBmdW5jdGlvbiB0aGF0IHRlc3RzIHdoZXRoZXIgaXRzIGFyZ3VtZW50IGlzIE5PVCBnZW9tZXRyaWNhbGx5IGVxdWFsIHRvIG9iai5cbiAgKi8gICBcbiAgaXNudChvYmopIHtcbiAgICBpZih0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykgeyBvYmogPSB0aGlzLmdldChvYmopOyB9XG4gICAgcmV0dXJuIChzZWNvbmRPYmopID0+IChvYmogJiYgIXRoaXMuZXF1YWwob2JqLCBzZWNvbmRPYmopKTtcbiAgfVxuICBcbiAgbGFzdCgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFzdDtcbiAgfVxuICBcbiAgZ2V0KG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fb2JqZWN0cy5nZXQobmFtZSk7XG4gIH1cbiAgXG4gIHBvaW50KG5hbWUsIHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5hZGQobmV3IFBvaW50KG5hbWUsIHgsIHkpKTtcbiAgfVxuICBcbiAgY2lyY2xlKG5hbWUsIGNlbnRlcklkLCBib3VuZGFyeUlkKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBDaXJjbGUobmFtZSwgdGhpcy5nZXQoY2VudGVySWQpLCB0aGlzLmdldChib3VuZGFyeUlkKSkpO1xuICB9XG4gIFxuICBzZWdtZW50KG5hbWUsIGlkMSwgaWQyKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5ldyBTZWdtZW50KG5hbWUsIHRoaXMuZ2V0KGlkMSksIHRoaXMuZ2V0KGlkMikpKTtcbiAgfVxuICBcbiAgbGluZShuYW1lLCBpZDEsIGlkMikge1xuICAgIHJldHVybiB0aGlzLmFkZChuZXcgTGluZShuYW1lLCB0aGlzLmdldChpZDEpLCB0aGlzLmdldChpZDIpKSk7XG4gIH1cbiAgXG4gIGludGVyc2VjdGlvbihuYW1lLCBpZDEsIGlkMiwgd2hpY2gpIHtcbiAgICBsZXQgbzEgPSB0aGlzLmdldChpZDEpLFxuICAgICAgICBvMiA9IHRoaXMuZ2V0KGlkMik7XG4gICAgaWYoIW8xKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIG9iamVjdCBcIitpZDEpO1xuICAgIGlmKCFvMikgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZmluZCBvYmplY3QgXCIraWQyKTtcblxuICAgIHJldHVybiB0aGlzLmFkZChuZXcgSW50ZXJzZWN0aW9uKG5hbWUsIG8xLCBvMiwgd2hpY2gpKTtcbiAgfVxuICBcbiAgZ3JvdXAodGFnKSB7XG4gICAgdGhpcy5fY3VycmVudFRhZyA9IHRhZztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBcbiAgYWRkKG9iamVjdCkge1xuICAgIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSB0aGlzIG9iamVjdCwgYW5kIGl0J3MgdGhlIHNhbWUgdHlwZSwgdGhlbiB1cGRhdGUgdGhlXG4gICAgLy8gZXhpc3Rpbmcgb25lIGluIHBsYWNlLlxuICAgIGxldCBleGlzdGluZyA9IHRoaXMuX29iamVjdHMuZ2V0KG9iamVjdC5uYW1lKTtcbiAgICBpZiAoZXhpc3RpbmcgJiYgZXhpc3RpbmcuY29uc3RydWN0b3IubmFtZSA9PT0gb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgIGZvcihsZXQgcHJvcCBpbiBvYmplY3QpIGV4aXN0aW5nW3Byb3BdID0gb2JqZWN0W3Byb3BdO1xuICAgICAgb2JqZWN0ID0gZXhpc3Rpbmc7XG4gICAgfVxuICAgIC8vIGlmIGEgZ2VvbWV0cmljYWxseSBlcXVpdmFsZW50IG9iamVjdCBleGlzdHMsIGRvIG5vdGhpbmcuXG4gICAgZWxzZSBpZihleGlzdGluZyA9IHRoaXMuZmluZChvYmplY3QpKSB7XG4gICAgICBjb25zb2xlLmxvZygnVHJpZWQgdG8gYWRkICcrb2JqZWN0KycgYnV0ICcrZXhpc3RpbmcrJyBpcyBhbHJlYWR5IGluIHNjZW5lLicpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8vIGFkZCBhIG5ldyBvYmplY3QgdG8gdGhlIHNjZW5lLlxuICAgIGVsc2Uge1xuICAgICAgb2JqZWN0Lm5hbWUgPSBvYmplY3QubmFtZSB8fCB0aGlzLmZyZWVOYW1lKCk7XG4gICAgICB0aGlzLl9vYmplY3RzLnNldChvYmplY3QubmFtZSwgb2JqZWN0KTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHRoaXMuX2N1cnJlbnRUYWcpIGFkZENsYXNzKG9iamVjdCwgdGhpcy5fY3VycmVudFRhZyk7XG4gICAgaWYgKG9iamVjdC5mcmVlKSBhZGRDbGFzcyhvYmplY3QsICdmcmVlLXBvaW50Jyk7XG4gICAgXG4gICAgdGhpcy51cGRhdGUob2JqZWN0KTtcbiAgICBcbiAgICB0aGlzLl9sYXN0ID0gb2JqZWN0O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBmcmVlTmFtZSgpIHtcbiAgICBsZXQga2V5cyA9IHRoaXMuX29iamVjdHMua2V5cygpLFxuICAgIGlkID0gMDtcbiAgICBmb3IoO2tleXMuaW5kZXhPZignb2JqZWN0JytpZCkgPj0gMDsgaWQrKyk7XG4gICAgcmV0dXJuICdvYmplY3QnK2lkO1xuICB9XG4gIFxuICAvKiogIFxuICAgKiB1cGRhdGUgLSBVcGRhdGUgb2JqZWN0cyB0byByZWZsZWN0IGNoYW5nZXMgaW4gZGVwZW5kZW50IG9iamVjdHMuIChFLmcuLFxuICAgKiB1cGRhdGUgSW50ZXJzZWN0aW9uIGNvb3JkaW5hdGVzIHdoZW4gdGhlIGludGVyc2VjdGVkIG9iamVjdHMgaGF2ZSBjaGFuZ2VkLilcbiAgICogICAgXG4gICAqIEBwYXJhbSB7R2VvbX0gcm9vdCBUaGUgb2JqZWN0IGZyb20gd2hpY2ggdG8gc3RhcnQgd2Fsa2luZyB0aGUgZGVwZW5kZW5jeSBncmFwaC4gIFxuICAgKi9cbiAgLy8gVE9ETzogcmVzcGVjdCBgcm9vdGAgcGFyYW1ldGVyLCBhbmQgZG8gYW4gYWN0dWFsIERBRyB3YWxrLlxuICB1cGRhdGUocm9vdCkge1xuICAgIHRoaXMuX29iamVjdHMudmFsdWVzKClcbiAgICAgIC5maWx0ZXIob2JqID0+IG9iaiBpbnN0YW5jZW9mIEludGVyc2VjdGlvbilcbiAgICAgIC5mb3JFYWNoKG9iaiA9PiBvYmoudXBkYXRlKCkpXG4gIH1cbiAgXG4gIGxvZ1N0YXRlKGxhYmVsKSB7XG4gICAgbGV0IHNlbGYgPSB0aGlzO1xuICAgIGxldCBvYmplY3RzID0gdGhpcy5fb2JqZWN0cy52YWx1ZXMoKTtcbiAgICBsZXQgcG9pbnRzID0gdGhpcy5wb2ludHMoKTtcblxuICAgIGxldCBzdGF0ZSA9IHtcbiAgICAgIGxhYmVsLFxuICAgICAgdGltZTogKG5ldyBEYXRlKCkpLnRvU3RyaW5nKCksXG4gICAgICBvYmplY3RzOiBvYmplY3RzLm1hcChvID0+IG8udG9TdHJpbmcoKSksXG4gICAgfVxuICAgIHRoaXMubG9nLnB1c2goc3RhdGUpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NlbmU7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgLypcbiAgICogR2VuZXJhdGVkIGJ5IFBFRy5qcyAwLjguMC5cbiAgICpcbiAgICogaHR0cDovL3BlZ2pzLm1hamRhLmN6L1xuICAgKi9cblxuICBmdW5jdGlvbiBwZWckc3ViY2xhc3MoY2hpbGQsIHBhcmVudCkge1xuICAgIGZ1bmN0aW9uIGN0b3IoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfVxuICAgIGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgY3RvcigpO1xuICB9XG5cbiAgZnVuY3Rpb24gU3ludGF4RXJyb3IobWVzc2FnZSwgZXhwZWN0ZWQsIGZvdW5kLCBvZmZzZXQsIGxpbmUsIGNvbHVtbikge1xuICAgIHRoaXMubWVzc2FnZSAgPSBtZXNzYWdlO1xuICAgIHRoaXMuZXhwZWN0ZWQgPSBleHBlY3RlZDtcbiAgICB0aGlzLmZvdW5kICAgID0gZm91bmQ7XG4gICAgdGhpcy5vZmZzZXQgICA9IG9mZnNldDtcbiAgICB0aGlzLmxpbmUgICAgID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiAgID0gY29sdW1uO1xuXG4gICAgdGhpcy5uYW1lICAgICA9IFwiU3ludGF4RXJyb3JcIjtcbiAgfVxuXG4gIHBlZyRzdWJjbGFzcyhTeW50YXhFcnJvciwgRXJyb3IpO1xuXG4gIGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHt9LFxuXG4gICAgICAgIHBlZyRGQUlMRUQgPSB7fSxcblxuICAgICAgICBwZWckc3RhcnRSdWxlRnVuY3Rpb25zID0geyBzdGFydDogcGVnJHBhcnNlc3RhcnQgfSxcbiAgICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uICA9IHBlZyRwYXJzZXN0YXJ0LFxuXG4gICAgICAgIHBlZyRjMCA9IHBlZyRGQUlMRUQsXG4gICAgICAgIHBlZyRjMSA9IFtdLFxuICAgICAgICBwZWckYzIgPSAvXltcXG4gXS8sXG4gICAgICAgIHBlZyRjMyA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbXFxcXG4gXVwiLCBkZXNjcmlwdGlvbjogXCJbXFxcXG4gXVwiIH0sXG4gICAgICAgIHBlZyRjNCA9IGZ1bmN0aW9uKHIpIHsgcmV0dXJuIHI7IH0sXG4gICAgICAgIHBlZyRjNSA9IGZ1bmN0aW9uKGQpIHtyZXR1cm4gZDt9LFxuICAgICAgICBwZWckYzYgPSBmdW5jdGlvbihoZWFkLCB0YWlsKSB7IHJldHVybiBbaGVhZF0uY29uY2F0KHRhaWwpIH0sXG4gICAgICAgIHBlZyRjNyA9IG51bGwsXG4gICAgICAgIHBlZyRjOCA9IFwibGV0XCIsXG4gICAgICAgIHBlZyRjOSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImxldFwiLCBkZXNjcmlwdGlvbjogXCJcXFwibGV0XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTAgPSBcImJlXCIsXG4gICAgICAgIHBlZyRjMTEgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJiZVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYmVcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMiA9IFwiZXF1YWxcIixcbiAgICAgICAgcGVnJGMxMyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImVxdWFsXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJlcXVhbFxcXCJcIiB9LFxuICAgICAgICBwZWckYzE0ID0gXCI9XCIsXG4gICAgICAgIHBlZyRjMTUgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCI9XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCI9XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTYgPSAvXlsgXS8sXG4gICAgICAgIHBlZyRjMTcgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiWyBdXCIsIGRlc2NyaXB0aW9uOiBcIlsgXVwiIH0sXG4gICAgICAgIHBlZyRjMTggPSBcIi5cIixcbiAgICAgICAgcGVnJGMxOSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIi5cIiwgZGVzY3JpcHRpb246IFwiXFxcIi5cXFwiXCIgfSxcbiAgICAgICAgcGVnJGMyMCA9IGZ1bmN0aW9uKG5hbWUsIG9iaikgeyByZXR1cm4gbmFtZWQob2JqLCBuYW1lKSB9LFxuICAgICAgICBwZWckYzIxID0gXCJkcmF3XCIsXG4gICAgICAgIHBlZyRjMjIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJkcmF3XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJkcmF3XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjMgPSBmdW5jdGlvbihuYW1lKSB7cmV0dXJuIG5hbWU7fSxcbiAgICAgICAgcGVnJGMyNCA9IGZ1bmN0aW9uKG9iaiwgbmFtZSkgeyByZXR1cm4gbmFtZWQob2JqLCBuYW1lKSB9LFxuICAgICAgICBwZWckYzI1ID0gXCIjXCIsXG4gICAgICAgIHBlZyRjMjYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIjXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIjXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjcgPSAvXlteXFxuXS8sXG4gICAgICAgIHBlZyRjMjggPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiW15cXFxcbl1cIiwgZGVzY3JpcHRpb246IFwiW15cXFxcbl1cIiB9LFxuICAgICAgICBwZWckYzI5ID0gZnVuY3Rpb24odmFsKSB7IHJldHVybiB7dHlwZTogJ2NvbW1lbnQnLCB2YWx1ZTogdmFsfSB9LFxuICAgICAgICBwZWckYzMwID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcInRoZSBuYW1lIG9mIGEgcG9pbnRcIiB9LFxuICAgICAgICBwZWckYzMxID0gXCJwb2ludFwiLFxuICAgICAgICBwZWckYzMyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwicG9pbnRcIiwgZGVzY3JpcHRpb246IFwiXFxcInBvaW50XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMzMgPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiB7dHlwZTogJ3BvaW50JywgbmFtZTpuYW1lfSB9LFxuICAgICAgICBwZWckYzM0ID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcIih4LHkpXCIgfSxcbiAgICAgICAgcGVnJGMzNSA9IFwiKFwiLFxuICAgICAgICBwZWckYzM2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiKFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiKFxcXCJcIiB9LFxuICAgICAgICBwZWckYzM3ID0gXCIsXCIsXG4gICAgICAgIHBlZyRjMzggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIsXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIsXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMzkgPSBcIilcIixcbiAgICAgICAgcGVnJGM0MCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIilcIiwgZGVzY3JpcHRpb246IFwiXFxcIilcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM0MSA9IGZ1bmN0aW9uKHgsIHkpIHsgcmV0dXJuIG8oe3R5cGU6ICdwb2ludCcseDogeCx5OiB5fSkgfSxcbiAgICAgICAgcGVnJGM0MiA9IHsgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogXCJuYW1lIG9mIGEgY2lyY2xlXCIgfSxcbiAgICAgICAgcGVnJGM0MyA9IFwiY2lyY2xlXCIsXG4gICAgICAgIHBlZyRjNDQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJjaXJjbGVcIiwgZGVzY3JpcHRpb246IFwiXFxcImNpcmNsZVxcXCJcIiB9LFxuICAgICAgICBwZWckYzQ1ID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4ge3R5cGU6ICdjaXJjbGUnLCBuYW1lOiBuYW1lfSB9LFxuICAgICAgICBwZWckYzQ2ID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcImNpcmNsZSBkZWZpbml0aW9uXCIgfSxcbiAgICAgICAgcGVnJGM0NyA9IFwiYW5kXCIsXG4gICAgICAgIHBlZyRjNDggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJhbmRcIiwgZGVzY3JpcHRpb246IFwiXFxcImFuZFxcXCJcIiB9LFxuICAgICAgICBwZWckYzQ5ID0gZnVuY3Rpb24oYzEsIGMyKSB7XG4gICAgICAgICAgaWYoYzEudHlwZSA9PT0gYzIudHlwZSkgeyBleHBlY3RlZCgnYSBjZW50ZXIgYW5kIGEgcG9pbnQgY29udGFpbmVkIGJ5IHRoZSBjaXJjbGUnKSB9XG4gICAgICAgICAgdmFyIHJldCA9IG8oe3R5cGU6ICdjaXJjbGUnfSk7XG4gICAgICAgICAgcmV0W2MxLnR5cGVdID0gYzEucG9pbnQ7XG4gICAgICAgICAgcmV0W2MyLnR5cGVdID0gYzIucG9pbnQ7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSxcbiAgICAgICAgcGVnJGM1MCA9IGZ1bmN0aW9uKGNlbnRlcikgeyByZXR1cm4ge3R5cGU6ICdjZW50ZXInLCBwb2ludDogY2VudGVyfSB9LFxuICAgICAgICBwZWckYzUxID0gZnVuY3Rpb24ocG9pbnQpIHsgcmV0dXJuIHt0eXBlOiAnYm91bmRhcnlQb2ludCcsIHBvaW50OiBwb2ludCB9IH0sXG4gICAgICAgIHBlZyRjNTIgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwidGhlIG5hbWUgb2YgYSBsaW5lIG9yIHNlZ21lbnRcIiB9LFxuICAgICAgICBwZWckYzUzID0gXCItXCIsXG4gICAgICAgIHBlZyRjNTQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCItXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCItXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNTUgPSBmdW5jdGlvbih0eXBlLCBwMSwgcDIpIHsgcmV0dXJuIHt0eXBlOiAnbGluZScsIHBvaW50czogW3AxLCBwMl19IH0sXG4gICAgICAgIHBlZyRjNTYgPSBmdW5jdGlvbih0eXBlLCBuYW1lKSB7IHJldHVybiB7dHlwZTogdHlwZSwgbmFtZTogbmFtZX0gfSxcbiAgICAgICAgcGVnJGM1NyA9IHsgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogXCJsaW5lIGRlZmluaXRpb25cIiB9LFxuICAgICAgICBwZWckYzU4ID0gZnVuY3Rpb24odHlwZSwgcG9pbnRzKSB7IHJldHVybiBvKHt0eXBlOiB0eXBlLCBwb2ludHM6IHBvaW50c30pIH0sXG4gICAgICAgIHBlZyRjNTkgPSBcImxpbmUgc2VnbWVudFwiLFxuICAgICAgICBwZWckYzYwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibGluZSBzZWdtZW50XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJsaW5lIHNlZ21lbnRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM2MSA9IFwic2VnbWVudFwiLFxuICAgICAgICBwZWckYzYyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwic2VnbWVudFwiLCBkZXNjcmlwdGlvbjogXCJcXFwic2VnbWVudFxcXCJcIiB9LFxuICAgICAgICBwZWckYzYzID0gXCJsaW5lXCIsXG4gICAgICAgIHBlZyRjNjQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJsaW5lXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJsaW5lXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNjUgPSBmdW5jdGlvbihsaW5lKSB7cmV0dXJuIChsaW5lID09PSAnbGluZScpID8gJ2xpbmUnIDogJ3NlZ21lbnQnIH0sXG4gICAgICAgIHBlZyRjNjYgPSBcImZyb21cIixcbiAgICAgICAgcGVnJGM2NyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImZyb21cIiwgZGVzY3JpcHRpb246IFwiXFxcImZyb21cXFwiXCIgfSxcbiAgICAgICAgcGVnJGM2OCA9IFwidG9cIixcbiAgICAgICAgcGVnJGM2OSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcInRvXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ0b1xcXCJcIiB9LFxuICAgICAgICBwZWckYzcwID0gZnVuY3Rpb24ocDEsIHAyKSB7IHJldHVybiBbcDEscDJdOyB9LFxuICAgICAgICBwZWckYzcxID0gXCJkZXRlcm1pbmVkIGJ5XCIsXG4gICAgICAgIHBlZyRjNzIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJkZXRlcm1pbmVkIGJ5XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJkZXRlcm1pbmVkIGJ5XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNzMgPSBcImJldHdlZW5cIixcbiAgICAgICAgcGVnJGM3NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImJldHdlZW5cIiwgZGVzY3JpcHRpb246IFwiXFxcImJldHdlZW5cXFwiXCIgfSxcbiAgICAgICAgcGVnJGM3NSA9IFwiam9pbmluZ1wiLFxuICAgICAgICBwZWckYzc2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiam9pbmluZ1wiLCBkZXNjcmlwdGlvbjogXCJcXFwiam9pbmluZ1xcXCJcIiB9LFxuICAgICAgICBwZWckYzc3ID0gXCJ3aXRoIGVuZHBvaW50c1wiLFxuICAgICAgICBwZWckYzc4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwid2l0aCBlbmRwb2ludHNcIiwgZGVzY3JpcHRpb246IFwiXFxcIndpdGggZW5kcG9pbnRzXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNzkgPSBmdW5jdGlvbihwMSwgcDIpIHsgcmV0dXJuIFtwMSwgcDJdOyB9LFxuICAgICAgICBwZWckYzgwID0gXCJpbnRlcnNlY3Rpb24gb2ZcIixcbiAgICAgICAgcGVnJGM4MSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImludGVyc2VjdGlvbiBvZlwiLCBkZXNjcmlwdGlvbjogXCJcXFwiaW50ZXJzZWN0aW9uIG9mXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjODIgPSBmdW5jdGlvbihjKSB7IHJldHVybiBjO30sXG4gICAgICAgIHBlZyRjODMgPSBmdW5jdGlvbihvYmplY3RzLCB3aGljaCkge3JldHVybiBvKHt0eXBlOiAnaW50ZXJzZWN0aW9uJywgb2JqZWN0czpvYmplY3RzLCB3aGljaDogd2hpY2h9KTt9LFxuICAgICAgICBwZWckYzg0ID0gZnVuY3Rpb24obzEsIG8yKSB7IHJldHVybiBbbzEsIG8yXSB9LFxuICAgICAgICBwZWckYzg1ID0gZnVuY3Rpb24obzEsIG8yKSB7IHJldHVybiBbe3R5cGU6J3Vua25vd24nLG5hbWU6bzF9LHt0eXBlOid1bmtub3duJyxuYW1lOm8yfV07IH0sXG4gICAgICAgIHBlZyRjODYgPSBcInRoYXRcIixcbiAgICAgICAgcGVnJGM4NyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcInRoYXRcIiwgZGVzY3JpcHRpb246IFwiXFxcInRoYXRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM4OCA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIHtvcDonbm90JywgYXJnczpbbmFtZV19IH0sXG4gICAgICAgIHBlZyRjODkgPSBcInRoYXQgaXMgb25cIixcbiAgICAgICAgcGVnJGM5MCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcInRoYXQgaXMgb25cIiwgZGVzY3JpcHRpb246IFwiXFxcInRoYXQgaXMgb25cXFwiXCIgfSxcbiAgICAgICAgcGVnJGM5MSA9IGZ1bmN0aW9uKG9iaikgeyByZXR1cm4ge29wOiAnb24nLCBhcmdzOltvYmpdfSB9LFxuICAgICAgICBwZWckYzkyID0gXCJhbmQgY2FsbCBpdFwiLFxuICAgICAgICBwZWckYzkzID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiYW5kIGNhbGwgaXRcIiwgZGVzY3JpcHRpb246IFwiXFxcImFuZCBjYWxsIGl0XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjOTQgPSBcImNhbGxlZFwiLFxuICAgICAgICBwZWckYzk1ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiY2FsbGVkXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJjYWxsZWRcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM5NiA9IFwibmFtZWRcIixcbiAgICAgICAgcGVnJGM5NyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm5hbWVkXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJuYW1lZFxcXCJcIiB9LFxuICAgICAgICBwZWckYzk4ID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gbmFtZTsgfSxcbiAgICAgICAgcGVnJGM5OSA9IFwid2l0aCBjZW50ZXJcIixcbiAgICAgICAgcGVnJGMxMDAgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJ3aXRoIGNlbnRlclwiLCBkZXNjcmlwdGlvbjogXCJcXFwid2l0aCBjZW50ZXJcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMDEgPSBcImNlbnRlcmVkIGF0XCIsXG4gICAgICAgIHBlZyRjMTAyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiY2VudGVyZWQgYXRcIiwgZGVzY3JpcHRpb246IFwiXFxcImNlbnRlcmVkIGF0XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTAzID0gXCJhXCIsXG4gICAgICAgIHBlZyRjMTA0ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiYVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYVxcXCJcIiB9LFxuICAgICAgICBwZWckYzEwNSA9IFwiYW5cIixcbiAgICAgICAgcGVnJGMxMDYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJhblwiLCBkZXNjcmlwdGlvbjogXCJcXFwiYW5cXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMDcgPSBcInRoZVwiLFxuICAgICAgICBwZWckYzEwOCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcInRoZVwiLCBkZXNjcmlwdGlvbjogXCJcXFwidGhlXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTA5ID0gXCJ0aHJvdWdoXCIsXG4gICAgICAgIHBlZyRjMTEwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidGhyb3VnaFwiLCBkZXNjcmlwdGlvbjogXCJcXFwidGhyb3VnaFxcXCJcIiB9LFxuICAgICAgICBwZWckYzExMSA9IFwiY29udGFpbmluZ1wiLFxuICAgICAgICBwZWckYzExMiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImNvbnRhaW5pbmdcIiwgZGVzY3JpcHRpb246IFwiXFxcImNvbnRhaW5pbmdcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMTMgPSBcImlzbid0XCIsXG4gICAgICAgIHBlZyRjMTE0ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiaXNuJ3RcIiwgZGVzY3JpcHRpb246IFwiXFxcImlzbid0XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTE1ID0gXCJpc250XCIsXG4gICAgICAgIHBlZyRjMTE2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiaXNudFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiaXNudFxcXCJcIiB9LFxuICAgICAgICBwZWckYzExNyA9IFwiaXMgbm90XCIsXG4gICAgICAgIHBlZyRjMTE4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiaXMgbm90XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJpcyBub3RcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMTkgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwid2hpdGVzcGFjZSBjaGFyYWN0ZXJcIiB9LFxuICAgICAgICBwZWckYzEyMCA9IFwiIFwiLFxuICAgICAgICBwZWckYzEyMSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIiBcIiwgZGVzY3JpcHRpb246IFwiXFxcIiBcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMjIgPSB7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IFwid2hpdGVzcGFjZVwiIH0sXG4gICAgICAgIHBlZyRjMTIzID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcIm51bWJlclwiIH0sXG4gICAgICAgIHBlZyRjMTI0ID0gL15bMC05LlxcLV0vLFxuICAgICAgICBwZWckYzEyNSA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbMC05LlxcXFwtXVwiLCBkZXNjcmlwdGlvbjogXCJbMC05LlxcXFwtXVwiIH0sXG4gICAgICAgIHBlZyRjMTI2ID0gZnVuY3Rpb24oZGlnaXRzKSB7IHJldHVybiBwYXJzZUludChkaWdpdHMuam9pbihcIlwiKSwgMTApOyB9LFxuICAgICAgICBwZWckYzEyNyA9IHsgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogXCJ2YXJpYWJsZSBuYW1lXCIgfSxcbiAgICAgICAgcGVnJGMxMjggPSAvXlthLXpBLVowLTldLyxcbiAgICAgICAgcGVnJGMxMjkgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiW2EtekEtWjAtOV1cIiwgZGVzY3JpcHRpb246IFwiW2EtekEtWjAtOV1cIiB9LFxuICAgICAgICBwZWckYzEzMCA9IGZ1bmN0aW9uKGNoYXJzKSB7IHJldHVybiBjaGFycy5qb2luKCcnKTsgfSxcblxuICAgICAgICBwZWckY3VyclBvcyAgICAgICAgICA9IDAsXG4gICAgICAgIHBlZyRyZXBvcnRlZFBvcyAgICAgID0gMCxcbiAgICAgICAgcGVnJGNhY2hlZFBvcyAgICAgICAgPSAwLFxuICAgICAgICBwZWckY2FjaGVkUG9zRGV0YWlscyA9IHsgbGluZTogMSwgY29sdW1uOiAxLCBzZWVuQ1I6IGZhbHNlIH0sXG4gICAgICAgIHBlZyRtYXhGYWlsUG9zICAgICAgID0gMCxcbiAgICAgICAgcGVnJG1heEZhaWxFeHBlY3RlZCAgPSBbXSxcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzICAgICAgPSAwLFxuXG4gICAgICAgIHBlZyRyZXN1bHQ7XG5cbiAgICBpZiAoXCJzdGFydFJ1bGVcIiBpbiBvcHRpb25zKSB7XG4gICAgICBpZiAoIShvcHRpb25zLnN0YXJ0UnVsZSBpbiBwZWckc3RhcnRSdWxlRnVuY3Rpb25zKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBzdGFydCBwYXJzaW5nIGZyb20gcnVsZSBcXFwiXCIgKyBvcHRpb25zLnN0YXJ0UnVsZSArIFwiXFxcIi5cIik7XG4gICAgICB9XG5cbiAgICAgIHBlZyRzdGFydFJ1bGVGdW5jdGlvbiA9IHBlZyRzdGFydFJ1bGVGdW5jdGlvbnNbb3B0aW9ucy5zdGFydFJ1bGVdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRleHQoKSB7XG4gICAgICByZXR1cm4gaW5wdXQuc3Vic3RyaW5nKHBlZyRyZXBvcnRlZFBvcywgcGVnJGN1cnJQb3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9mZnNldCgpIHtcbiAgICAgIHJldHVybiBwZWckcmVwb3J0ZWRQb3M7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGluZSgpIHtcbiAgICAgIHJldHVybiBwZWckY29tcHV0ZVBvc0RldGFpbHMocGVnJHJlcG9ydGVkUG9zKS5saW5lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbHVtbigpIHtcbiAgICAgIHJldHVybiBwZWckY29tcHV0ZVBvc0RldGFpbHMocGVnJHJlcG9ydGVkUG9zKS5jb2x1bW47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhwZWN0ZWQoZGVzY3JpcHRpb24pIHtcbiAgICAgIHRocm93IHBlZyRidWlsZEV4Y2VwdGlvbihcbiAgICAgICAgbnVsbCxcbiAgICAgICAgW3sgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24gfV0sXG4gICAgICAgIHBlZyRyZXBvcnRlZFBvc1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlcnJvcihtZXNzYWdlKSB7XG4gICAgICB0aHJvdyBwZWckYnVpbGRFeGNlcHRpb24obWVzc2FnZSwgbnVsbCwgcGVnJHJlcG9ydGVkUG9zKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckY29tcHV0ZVBvc0RldGFpbHMocG9zKSB7XG4gICAgICBmdW5jdGlvbiBhZHZhbmNlKGRldGFpbHMsIHN0YXJ0UG9zLCBlbmRQb3MpIHtcbiAgICAgICAgdmFyIHAsIGNoO1xuXG4gICAgICAgIGZvciAocCA9IHN0YXJ0UG9zOyBwIDwgZW5kUG9zOyBwKyspIHtcbiAgICAgICAgICBjaCA9IGlucHV0LmNoYXJBdChwKTtcbiAgICAgICAgICBpZiAoY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgIGlmICghZGV0YWlscy5zZWVuQ1IpIHsgZGV0YWlscy5saW5lKys7IH1cbiAgICAgICAgICAgIGRldGFpbHMuY29sdW1uID0gMTtcbiAgICAgICAgICAgIGRldGFpbHMuc2VlbkNSID0gZmFsc2U7XG4gICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gXCJcXHJcIiB8fCBjaCA9PT0gXCJcXHUyMDI4XCIgfHwgY2ggPT09IFwiXFx1MjAyOVwiKSB7XG4gICAgICAgICAgICBkZXRhaWxzLmxpbmUrKztcbiAgICAgICAgICAgIGRldGFpbHMuY29sdW1uID0gMTtcbiAgICAgICAgICAgIGRldGFpbHMuc2VlbkNSID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4rKztcbiAgICAgICAgICAgIGRldGFpbHMuc2VlbkNSID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChwZWckY2FjaGVkUG9zICE9PSBwb3MpIHtcbiAgICAgICAgaWYgKHBlZyRjYWNoZWRQb3MgPiBwb3MpIHtcbiAgICAgICAgICBwZWckY2FjaGVkUG9zID0gMDtcbiAgICAgICAgICBwZWckY2FjaGVkUG9zRGV0YWlscyA9IHsgbGluZTogMSwgY29sdW1uOiAxLCBzZWVuQ1I6IGZhbHNlIH07XG4gICAgICAgIH1cbiAgICAgICAgYWR2YW5jZShwZWckY2FjaGVkUG9zRGV0YWlscywgcGVnJGNhY2hlZFBvcywgcG9zKTtcbiAgICAgICAgcGVnJGNhY2hlZFBvcyA9IHBvcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBlZyRjYWNoZWRQb3NEZXRhaWxzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRmYWlsKGV4cGVjdGVkKSB7XG4gICAgICBpZiAocGVnJGN1cnJQb3MgPCBwZWckbWF4RmFpbFBvcykgeyByZXR1cm47IH1cblxuICAgICAgaWYgKHBlZyRjdXJyUG9zID4gcGVnJG1heEZhaWxQb3MpIHtcbiAgICAgICAgcGVnJG1heEZhaWxQb3MgPSBwZWckY3VyclBvcztcbiAgICAgICAgcGVnJG1heEZhaWxFeHBlY3RlZCA9IFtdO1xuICAgICAgfVxuXG4gICAgICBwZWckbWF4RmFpbEV4cGVjdGVkLnB1c2goZXhwZWN0ZWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRidWlsZEV4Y2VwdGlvbihtZXNzYWdlLCBleHBlY3RlZCwgcG9zKSB7XG4gICAgICBmdW5jdGlvbiBjbGVhbnVwRXhwZWN0ZWQoZXhwZWN0ZWQpIHtcbiAgICAgICAgdmFyIGkgPSAxO1xuXG4gICAgICAgIGV4cGVjdGVkLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgIGlmIChhLmRlc2NyaXB0aW9uIDwgYi5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYS5kZXNjcmlwdGlvbiA+IGIuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHdoaWxlIChpIDwgZXhwZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKGV4cGVjdGVkW2kgLSAxXSA9PT0gZXhwZWN0ZWRbaV0pIHtcbiAgICAgICAgICAgIGV4cGVjdGVkLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBidWlsZE1lc3NhZ2UoZXhwZWN0ZWQsIGZvdW5kKSB7XG4gICAgICAgIGZ1bmN0aW9uIHN0cmluZ0VzY2FwZShzKSB7XG4gICAgICAgICAgZnVuY3Rpb24gaGV4KGNoKSB7IHJldHVybiBjaC5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpOyB9XG5cbiAgICAgICAgICByZXR1cm4gc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgICAnXFxcXFxcXFwnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICAgICdcXFxcXCInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xceDA4L2csICdcXFxcYicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx0L2csICAgJ1xcXFx0JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXG4vZywgICAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcZi9nLCAgICdcXFxcZicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxyL2csICAgJ1xcXFxyJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx4MDAtXFx4MDdcXHgwQlxceDBFXFx4MEZdL2csIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHgwJyArIGhleChjaCk7IH0pXG4gICAgICAgICAgICAucmVwbGFjZSgvW1xceDEwLVxceDFGXFx4ODAtXFx4RkZdL2csICAgIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHgnICArIGhleChjaCk7IH0pXG4gICAgICAgICAgICAucmVwbGFjZSgvW1xcdTAxODAtXFx1MEZGRl0vZywgICAgICAgICBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx1MCcgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHUxMDgwLVxcdUZGRkZdL2csICAgICAgICAgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxcdScgICsgaGV4KGNoKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXhwZWN0ZWREZXNjcyA9IG5ldyBBcnJheShleHBlY3RlZC5sZW5ndGgpLFxuICAgICAgICAgICAgZXhwZWN0ZWREZXNjLCBmb3VuZERlc2MsIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4cGVjdGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgZXhwZWN0ZWREZXNjc1tpXSA9IGV4cGVjdGVkW2ldLmRlc2NyaXB0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0ZWREZXNjID0gZXhwZWN0ZWQubGVuZ3RoID4gMVxuICAgICAgICAgID8gZXhwZWN0ZWREZXNjcy5zbGljZSgwLCAtMSkuam9pbihcIiwgXCIpXG4gICAgICAgICAgICAgICsgXCIgb3IgXCJcbiAgICAgICAgICAgICAgKyBleHBlY3RlZERlc2NzW2V4cGVjdGVkLmxlbmd0aCAtIDFdXG4gICAgICAgICAgOiBleHBlY3RlZERlc2NzWzBdO1xuXG4gICAgICAgIGZvdW5kRGVzYyA9IGZvdW5kID8gXCJcXFwiXCIgKyBzdHJpbmdFc2NhcGUoZm91bmQpICsgXCJcXFwiXCIgOiBcImVuZCBvZiBpbnB1dFwiO1xuXG4gICAgICAgIHJldHVybiBcIkV4cGVjdGVkIFwiICsgZXhwZWN0ZWREZXNjICsgXCIgYnV0IFwiICsgZm91bmREZXNjICsgXCIgZm91bmQuXCI7XG4gICAgICB9XG5cbiAgICAgIHZhciBwb3NEZXRhaWxzID0gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBvcyksXG4gICAgICAgICAgZm91bmQgICAgICA9IHBvcyA8IGlucHV0Lmxlbmd0aCA/IGlucHV0LmNoYXJBdChwb3MpIDogbnVsbDtcblxuICAgICAgaWYgKGV4cGVjdGVkICE9PSBudWxsKSB7XG4gICAgICAgIGNsZWFudXBFeHBlY3RlZChleHBlY3RlZCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIG1lc3NhZ2UgIT09IG51bGwgPyBtZXNzYWdlIDogYnVpbGRNZXNzYWdlKGV4cGVjdGVkLCBmb3VuZCksXG4gICAgICAgIGV4cGVjdGVkLFxuICAgICAgICBmb3VuZCxcbiAgICAgICAgcG9zLFxuICAgICAgICBwb3NEZXRhaWxzLmxpbmUsXG4gICAgICAgIHBvc0RldGFpbHMuY29sdW1uXG4gICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXN0YXJ0KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VkZWNsYXJhdGlvbl9saXN0KCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBbXTtcbiAgICAgICAgaWYgKHBlZyRjMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgczMgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzKTsgfVxuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyLnB1c2goczMpO1xuICAgICAgICAgIGlmIChwZWckYzIudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczMgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMpOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgIHMxID0gcGVnJGM0KHMxKTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlZGVjbGFyYXRpb25fbGlzdCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VkZWNsYXJhdGlvbigpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gW107XG4gICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHM0ID0gW107XG4gICAgICAgIGlmIChwZWckYzIudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMyk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICB3aGlsZSAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgaWYgKHBlZyRjMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHM1ID0gcGVnJHBhcnNlZGVjbGFyYXRpb24oKTtcbiAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMzO1xuICAgICAgICAgICAgczQgPSBwZWckYzUoczUpO1xuICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgIHMzID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgIHMzID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyLnB1c2goczMpO1xuICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgczQgPSBbXTtcbiAgICAgICAgICBpZiAocGVnJGMyLnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzKTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHdoaWxlIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNC5wdXNoKHM1KTtcbiAgICAgICAgICAgICAgaWYgKHBlZyRjMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzKTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlZGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMztcbiAgICAgICAgICAgICAgczQgPSBwZWckYzUoczUpO1xuICAgICAgICAgICAgICBzMyA9IHM0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgczMgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzYoczEsIHMyKTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlZGVjbGFyYXRpb24oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3LCBzODtcblxuICAgICAgczAgPSBwZWckcGFyc2Vjb21tZW50KCk7XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM4KSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM5KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBbczIsIHMzXTtcbiAgICAgICAgICAgIHMxID0gczI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgICBzMSA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMSA9IHBlZyRjNztcbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMiA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzEwKSB7XG4gICAgICAgICAgICAgICAgczQgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMSk7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczQgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzEyKSB7XG4gICAgICAgICAgICAgICAgICBzNCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSk7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTMpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA2MSkge1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMTQ7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxNSk7IH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZW9iamVjdF9saXRlcmFsKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczcgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjMTYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgIHM4ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTcpOyB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczcucHVzaChzOCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjMTYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczggPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgczggPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzE3KTsgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRjMTg7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTkpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzOCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczggPSBwZWckYzc7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzOCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMjAoczIsIHM2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMjEpIHtcbiAgICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMyMik7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzMyA9IHBlZyRwYXJzZW9iamVjdF9saXRlcmFsKCk7XG4gICAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM0ID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZWNhbGxlZCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRjMjMoczYpO1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHM1O1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNDtcbiAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczQ7XG4gICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjNztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNSA9IFtdO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjMTYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBzNiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxNyk7IH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHdoaWxlIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNS5wdXNoKHM2KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjMTYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgIHM2ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTcpOyB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckYzE4O1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxOSk7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczYgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjNztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMjQoczMsIHM0KTtcbiAgICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vjb21tZW50KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczU7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDM1KSB7XG4gICAgICAgIHMxID0gcGVnJGMyNTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzI2KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlcygpO1xuICAgICAgICBpZiAoczIgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMiA9IHBlZyRjNztcbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgIHM0ID0gW107XG4gICAgICAgICAgaWYgKHBlZyRjMjcudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczUgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzI4KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgaWYgKHBlZyRjMjcudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICBzNSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMyOCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LnN1YnN0cmluZyhzMywgcGVnJGN1cnJQb3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzMyA9IHM0O1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMjkoczMpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW9iamVjdF9saXRlcmFsKCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZXBvaW50X2xpdGVyYWwoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZW9iamVjdF8yZF9saXRlcmFsKCk7XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMwID0gcGVnJHBhcnNlaW50ZXJzZWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW9iamVjdF8yZF9saXRlcmFsKCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZWNpcmNsZV9saXRlcmFsKCk7XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckcGFyc2VsaW5lX2xpdGVyYWwoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW9iamVjdF8yZF9yZWZlcmVuY2UoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlY2lyY2xlX3JlZmVyZW5jZSgpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlbGluZV9yZWZlcmVuY2UoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXBvaW50KCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZXBvaW50X2xpdGVyYWwoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZWludGVyc2VjdGlvbigpO1xuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMCA9IHBlZyRwYXJzZXBvaW50X3JlZmVyZW5jZSgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vwb2ludF9yZWZlcmVuY2UoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckY3VyclBvcztcbiAgICAgIHMyID0gcGVnJHBhcnNlYXRoZSgpO1xuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMzEpIHtcbiAgICAgICAgICBzMyA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMyKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHM0ID0gW107XG4gICAgICAgICAgczUgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgd2hpbGUgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNC5wdXNoKHM1KTtcbiAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gW3MyLCBzMywgczRdO1xuICAgICAgICAgICAgczEgPSBzMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICBzMSA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRjNztcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgIHMxID0gcGVnJGMzMyhzMik7XG4gICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMwKTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlcG9pbnRfbGl0ZXJhbCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4LCBzOSwgczEwO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRjdXJyUG9zO1xuICAgICAgczIgPSBwZWckcGFyc2VhdGhlKCk7XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMzMSkge1xuICAgICAgICAgIHMzID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzIpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczQgPSBbXTtcbiAgICAgICAgICBzNSA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICB3aGlsZSAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBbczIsIHMzLCBzNF07XG4gICAgICAgICAgICBzMSA9IHMyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJGM3O1xuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDApIHtcbiAgICAgICAgICBzMiA9IHBlZyRjMzU7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM2KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgIGlmIChzMyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckYzc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VudW1iZXIoKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgaWYgKHM1ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckYzc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgICAgICAgczYgPSBwZWckYzM3O1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM4KTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM3ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJGM3O1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlbnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzOCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgIHM5ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChzOSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckYzc7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzOSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0MSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckYzM5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgczEwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQwKTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzQxKHM0LCBzOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM0KTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlY2lyY2xlKCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZWNpcmNsZV9yZWZlcmVuY2UoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZWNpcmNsZV9saXRlcmFsKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjaXJjbGVfcmVmZXJlbmNlKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQzKSB7XG4gICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KTtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gNjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQ0KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGM0NShzMyk7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDIpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjaXJjbGVfbGl0ZXJhbCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4O1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZWF0aGUoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQzKSB7XG4gICAgICAgICAgczIgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0NCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlY2lyY2xlX2NyaXRlcmlvbigpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDcpIHtcbiAgICAgICAgICAgICAgICAgIHM3ID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKTtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0OCk7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzOCA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzOCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IFtzNywgczhdO1xuICAgICAgICAgICAgICAgICAgICBzNiA9IHM3O1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNjtcbiAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczY7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM2ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjNztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZWNpcmNsZV9jcml0ZXJpb24oKTtcbiAgICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzQ5KHM0LCBzNyk7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQ2KTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlY2lyY2xlX2NyaXRlcmlvbigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlY2VudGVyZWRhdCgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZXBvaW50KCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGM1MChzMyk7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJHBhcnNldGhyb3VnaCgpO1xuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlcG9pbnQoKTtcbiAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczEgPSBwZWckYzUxKHMzKTtcbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWxpbmUoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlbGluZV9yZWZlcmVuY2UoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZWxpbmVfbGl0ZXJhbCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbGluZV9yZWZlcmVuY2UoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczY7XG5cbiAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlYXRoZSgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlbGluZW9yc2VnKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2Vwb2ludF9yZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ1KSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckYzUzO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM1NCk7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXBvaW50X3JlZmVyZW5jZSgpO1xuICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNTUoczIsIHM0LCBzNik7XG4gICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJHBhcnNlbGluZW9yc2VnKCk7XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckcGFyc2V2YXJpYWJsZSgpO1xuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMSA9IHBlZyRjNTYoczEsIHMzKTtcbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzUyKTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbGluZV9saXRlcmFsKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcblxuICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VhdGhlKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VsaW5lb3JzZWcoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZXR3b19wb2ludHMoKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczEgPSBwZWckYzU4KHMyLCBzNCk7XG4gICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzU3KTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbGluZW9yc2VnKCkge1xuICAgICAgdmFyIHMwLCBzMTtcblxuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTIpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNTkpIHtcbiAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEyKTtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2MCk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA3KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzYxKSB7XG4gICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2Mik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNjMpIHtcbiAgICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2NCk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGM2NShzMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXR3b19wb2ludHMoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3LCBzODtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNjYpIHtcbiAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjcpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlcG9pbnQoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNjgpIHtcbiAgICAgICAgICAgICAgICBzNSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMik7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzY5KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2Vwb2ludCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNzAoczMsIHM3KTtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJHBhcnNldGhyb3VnaCgpO1xuICAgICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM3MSkge1xuICAgICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEzKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDEzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNzIpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM3Mykge1xuICAgICAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNyk7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM3NCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA3KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzc1KSB7XG4gICAgICAgICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM3Nik7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxNCkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM3Nykge1xuICAgICAgICAgICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDE0KTtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDE0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNzgpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckcGFyc2Vwb2ludCgpO1xuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQ3KSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMyk7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDgpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczUgPSBbczUsIHM2LCBzN107XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gczU7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNDtcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM0ID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgczUgPSBbXTtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM1LnB1c2goczYpO1xuICAgICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjMzc7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzOCk7IH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczcucHVzaChzOCk7XG4gICAgICAgICAgICAgICAgICAgICAgczggPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczUgPSBbczUsIHM2LCBzN107XG4gICAgICAgICAgICAgICAgICAgICAgczQgPSBzNTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM0O1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNDtcbiAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRwYXJzZXBvaW50KCk7XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGM3OShzMywgczUpO1xuICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VpbnRlcnNlY3Rpb24oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VhdGhlKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTUpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjODApIHtcbiAgICAgICAgICBzMiA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTUpO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDE1O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjODEpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZWludGVyc2VjdGlvbl9vYmplY3RzKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM3ID0gcGVnJHBhcnNlaW50ZXJzZWN0aW9uX2NvbmRpdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczU7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRjODIoczcpO1xuICAgICAgICAgICAgICAgICAgczUgPSBzNjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNTtcbiAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM1O1xuICAgICAgICAgICAgICAgIHM1ID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM1ID0gcGVnJGM3O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGM4MyhzNCwgczUpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VpbnRlcnNlY3Rpb25fb2JqZWN0cygpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNjtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlb2JqZWN0XzJkX3JlZmVyZW5jZSgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzQ3KSB7XG4gICAgICAgICAgICBzNCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSAzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDgpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczMgPSBbczMsIHM0LCBzNV07XG4gICAgICAgICAgICAgIHMyID0gczM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMiA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBzNCA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRjMzc7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzOCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IFtdO1xuICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgd2hpbGUgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczUucHVzaChzNik7XG4gICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczMgPSBbczMsIHM0LCBzNV07XG4gICAgICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgIHMyID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZW9iamVjdF8yZF9yZWZlcmVuY2UoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzg0KHMxLCBzMyk7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJHBhcnNldmFyaWFibGUoKTtcbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjNDcpIHtcbiAgICAgICAgICAgICAgczQgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDMpO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDgpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gW3MzLCBzNCwgczVdO1xuICAgICAgICAgICAgICAgIHMyID0gczM7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgICAgczIgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgICBzNCA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckYzM3O1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzOCk7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNSA9IFtdO1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlcygpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczUucHVzaChzNik7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzMyA9IFtzMywgczQsIHM1XTtcbiAgICAgICAgICAgICAgICAgIHMyID0gczM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgICAgczIgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckcGFyc2V2YXJpYWJsZSgpO1xuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMSA9IHBlZyRjODUoczEsIHMzKTtcbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWludGVyc2VjdGlvbl9jb25kaXRpb24oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjODYpIHtcbiAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpO1xuICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjODcpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlaXNudCgpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2V2YXJpYWJsZSgpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjODgoczUpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjODkpIHtcbiAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApO1xuICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDEwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOTApOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZW9iamVjdF8yZF9yZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczEgPSBwZWckYzkxKHMzKTtcbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWNhbGxlZCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDExKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzkyKSB7XG4gICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMSk7XG4gICAgICAgIHBlZyRjdXJyUG9zICs9IDExO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOTMpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNikudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM5NCkge1xuICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOTUpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGM5Nikge1xuICAgICAgICAgICAgczEgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzk3KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZXZhcmlhYmxlKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGM5OChzMyk7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlY2VudGVyZWRhdCgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTEpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjOTkpIHtcbiAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDExKTtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMDApOyB9XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTEpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTAxKSB7XG4gICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDExKTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAxMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEwMik7IH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlYXJ0aWNsZSgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA5Nykge1xuICAgICAgICBzMCA9IHBlZyRjMTAzO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTA0KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpID09PSBwZWckYzEwNSkge1xuICAgICAgICAgIHMwID0gcGVnJGMxMDU7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEwNik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAzKSA9PT0gcGVnJGMxMDcpIHtcbiAgICAgICAgICAgIHMwID0gcGVnJGMxMDc7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSAzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTA4KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldGhyb3VnaCgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNykudG9Mb3dlckNhc2UoKSA9PT0gcGVnJGMxMDkpIHtcbiAgICAgICAgczAgPSBpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpO1xuICAgICAgICBwZWckY3VyclBvcyArPSA3O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTEwKTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEwKS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzExMSkge1xuICAgICAgICAgIHMwID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMCk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMTIpOyB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWlzbnQoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDUpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTEzKSB7XG4gICAgICAgIHMwID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA1KTtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gNTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzExNCk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KS50b0xvd2VyQ2FzZSgpID09PSBwZWckYzExNSkge1xuICAgICAgICAgIHMwID0gaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KTtcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTE2KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpLnRvTG93ZXJDYXNlKCkgPT09IHBlZyRjMTE3KSB7XG4gICAgICAgICAgICBzMCA9IGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNik7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSA2O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTE4KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlYXRoZSgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VhcnRpY2xlKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMxID0gW3MxLCBzMl07XG4gICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRjNztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXMoKSB7XG4gICAgICB2YXIgczAsIHMxO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMzIpIHtcbiAgICAgICAgczAgPSBwZWckYzEyMDtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyMSk7IH1cbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzExOSk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZV8oKSB7XG4gICAgICB2YXIgczAsIHMxO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gW107XG4gICAgICBzMSA9IHBlZyRwYXJzZXMoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMC5wdXNoKHMxKTtcbiAgICAgICAgICBzMSA9IHBlZyRwYXJzZXMoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMjIpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VudW1iZXIoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMjtcblxuICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzEyNC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyNSk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICBpZiAocGVnJGMxMjQudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyNSk7IH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJGMwO1xuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICBzMSA9IHBlZyRjMTI2KHMxKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG4gICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMjMpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2V2YXJpYWJsZSgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjMTI4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTI5KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICAgIGlmIChwZWckYzEyOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTI5KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgIHMxID0gcGVnJGMxMzAoczEpO1xuICAgICAgfVxuICAgICAgczAgPSBzMTtcbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyNyk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuXG4gICAgICAvLyBwcmVwcm9jZXNzOiBcbiAgICAgIC8vIG5vcm1hbGl6ZSB3aGl0ZXNwYWNlIHRvIHNpbmdsZSBzcGFjZSAvIHNpbmdsZSBuZXdsaW5lXG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIG5hbWVkKG9iaiwgbmFtZSkge1xuICAgICAgICBvYmoubmFtZSA9IG5hbWU7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8qIGFubm90YXRlIHRoZSBnaXZlbiBvYmplY3Qgd2l0aCBzb3VyY2UgaW5mbyAqL1xuICAgICAgZnVuY3Rpb24gbyhvYmopIHtcbiAgICAgICAgb2JqLnNvdXJjZSA9IHtcbiAgICAgICAgICB0ZXh0OiB0ZXh0KCksXG4gICAgICAgICAgbGluZTogbGluZSgpLFxuICAgICAgICAgIGNvbHVtbjogY29sdW1uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG5cbiAgICBwZWckcmVzdWx0ID0gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uKCk7XG5cbiAgICBpZiAocGVnJHJlc3VsdCAhPT0gcGVnJEZBSUxFRCAmJiBwZWckY3VyclBvcyA9PT0gaW5wdXQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcGVnJHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHBlZyRyZXN1bHQgIT09IHBlZyRGQUlMRUQgJiYgcGVnJGN1cnJQb3MgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgcGVnJGZhaWwoeyB0eXBlOiBcImVuZFwiLCBkZXNjcmlwdGlvbjogXCJlbmQgb2YgaW5wdXRcIiB9KTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKG51bGwsIHBlZyRtYXhGYWlsRXhwZWN0ZWQsIHBlZyRtYXhGYWlsUG9zKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIFN5bnRheEVycm9yOiBTeW50YXhFcnJvcixcbiAgICBwYXJzZTogICAgICAgcGFyc2VcbiAgfTtcbn0pKCk7XG4iLCJcInVzZSBzdHJpY3RcIlxuXG5mdW5jdGlvbiB1bmlxdWVfcHJlZChsaXN0LCBjb21wYXJlKSB7XG4gIHZhciBwdHIgPSAxXG4gICAgLCBsZW4gPSBsaXN0Lmxlbmd0aFxuICAgICwgYT1saXN0WzBdLCBiPWxpc3RbMF1cbiAgZm9yKHZhciBpPTE7IGk8bGVuOyArK2kpIHtcbiAgICBiID0gYVxuICAgIGEgPSBsaXN0W2ldXG4gICAgaWYoY29tcGFyZShhLCBiKSkge1xuICAgICAgaWYoaSA9PT0gcHRyKSB7XG4gICAgICAgIHB0cisrXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBsaXN0W3B0cisrXSA9IGFcbiAgICB9XG4gIH1cbiAgbGlzdC5sZW5ndGggPSBwdHJcbiAgcmV0dXJuIGxpc3Rcbn1cblxuZnVuY3Rpb24gdW5pcXVlX2VxKGxpc3QpIHtcbiAgdmFyIHB0ciA9IDFcbiAgICAsIGxlbiA9IGxpc3QubGVuZ3RoXG4gICAgLCBhPWxpc3RbMF0sIGIgPSBsaXN0WzBdXG4gIGZvcih2YXIgaT0xOyBpPGxlbjsgKytpLCBiPWEpIHtcbiAgICBiID0gYVxuICAgIGEgPSBsaXN0W2ldXG4gICAgaWYoYSAhPT0gYikge1xuICAgICAgaWYoaSA9PT0gcHRyKSB7XG4gICAgICAgIHB0cisrXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBsaXN0W3B0cisrXSA9IGFcbiAgICB9XG4gIH1cbiAgbGlzdC5sZW5ndGggPSBwdHJcbiAgcmV0dXJuIGxpc3Rcbn1cblxuZnVuY3Rpb24gdW5pcXVlKGxpc3QsIGNvbXBhcmUsIHNvcnRlZCkge1xuICBpZihsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBsaXN0XG4gIH1cbiAgaWYoY29tcGFyZSkge1xuICAgIGlmKCFzb3J0ZWQpIHtcbiAgICAgIGxpc3Quc29ydChjb21wYXJlKVxuICAgIH1cbiAgICByZXR1cm4gdW5pcXVlX3ByZWQobGlzdCwgY29tcGFyZSlcbiAgfVxuICBpZighc29ydGVkKSB7XG4gICAgbGlzdC5zb3J0KClcbiAgfVxuICByZXR1cm4gdW5pcXVlX2VxKGxpc3QpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gdW5pcXVlXG4iXX0=
