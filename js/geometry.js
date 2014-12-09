!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.geom=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports = {
  model: require("./lib/model"),
  intersection: require("./lib/intersection"),
  Scene: require("./lib/scene"),
  renderer: require("./lib/render"),
  behavior: require("./lib/behavior")
};

},{"./lib/behavior":2,"./lib/intersection":3,"./lib/model":4,"./lib/render":5,"./lib/scene":6}],2:[function(require,module,exports){
"use strict";

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

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

},{}],3:[function(require,module,exports){
"use strict";

var _slice = Array.prototype.slice;
var _applyConstructor = function (Constructor, args) {
  var instance = Object.create(Constructor.prototype);

  var result = Constructor.apply(instance, args);

  return result != null && (typeof result == "object" || typeof result == "function") ? result : instance;
};

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

var uniq = require("uniq");

var _ref = require("./model");

var Point = _ref.Point;
var Line = _ref.Line;
var Segment = _ref.Segment;
var Circle = _ref.Circle;



/* subclass of Point for representing object intersection */
var Intersection = (function (Point) {
  var Intersection = function Intersection(x, y) {
    var objects = _slice.call(arguments, 2);

    Point.call(this, x, y);
    this.objects = objects;
    this.free = false;
  };

  _extends(Intersection, Point);

  Intersection.prototype.toString = function (verbose) {
    var pstr = Point.prototype.toString.call(this);
    return (!verbose) ? pstr : pstr + " objects:" + this.objects.map(function (o) {
      return o.toString();
    }).join(",");
  };

  return Intersection;
})(Point);




/* helpers */

// shorthand for constructing an intersection point.
function P(x, y) {
  var objects = _slice.call(arguments, 2);

  return _applyConstructor(Intersection, [x, y].concat(_toArray(objects)));
}

function comparePoints(p, q) {
  return (p.x === q.x && p.y === q.y) ? 0 : 1;
}

function dd(p1, p2) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function sq(a) {
  return a * a;
}


/*
  Intersection of two objects; returns an array, possibly empty, of 
  intersection points.
*/
function intersect(o1, o2) {
  if (o1 instanceof Circle && o2 instanceof Circle) // circle-circle
    return intersectCircleCircle(o1, o2);else if (o2 instanceof Circle) // if only one is a circle, it should be first.
    return intersect(o2, o1);else if (o1 instanceof Circle && o2 instanceof Segment) // circle-segment
    return intersectCircleSegment(o1, o2);else if (o1 instanceof Segment && o2 instanceof Segment) // segment-segment
    return intersectSegmentSegment(o1, o2);else if (o2 instanceof Segment) // if only one is a segment, it should be first.
    return intersect(o2, o1);

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

  return unique([P(cx + nx, cy - ny, c1, c2), P(cx - nx, cy + ny, c1, c2)], comparePoints);
}

function intersectSegmentSegment(s1, s2) {
  var _ref2 = _toArray(s1.p);

  var x1 = _ref2[0].x;
  var y1 = _ref2[0].y;
  var x2 = _ref2[1].x;
  var y2 = _ref2[1].y;
  var _ref3 = _toArray(s2.p);

  var x3 = _ref3[0].x;
  var y3 = _ref3[0].y;
  var x4 = _ref3[1].x;
  var y4 = _ref3[1].y;
  var s = (-s1.dy * (x1 - x3) + s1.dx * (y1 - y3)) / (-s2.dx * s1.dy + s1.dx * s2.dy);
  var t = (s2.dx * (y1 - y3) - s2.dy * (x1 - x3)) / (-s2.dx * s1.dy + s1.dx * s2.dy);

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return unique([P(x1 + t * s1.dx, y1 + t * s1.dy, s1, s2)], comparePoints);else return []; // no collision
}

/* http://mathworld.wolfram.com/Circle-LineIntersection.html */
function intersectCircleSegment(c, s) {
  var _ref4 = _toArray(s.p);

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
  return unique([P(cx + nx + x0, cy + ny + y0, c, s), P(cx - nx + x0, cy - ny + y0, c, s)], comparePoints).filter(function (p) {
    return s.y(p.x);
  }); // filter out points not defined on segment
}





module.exports = {
  Intersection: Intersection,
  intersect: intersect,
  intersectCircleCircle: intersectCircleCircle,
  intersectCircleSegment: intersectCircleSegment,
  intersectSegmentSegment: intersectSegmentSegment };

},{"./model":4,"uniq":7}],4:[function(require,module,exports){
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

var Point = (function () {
  var Point = function Point(x, y) {
    this.x = x;
    this.y = y;
    this.free = true;
  };

  Point.prototype.toString = function () {
    return "(" + this.x + "," + this.y + ")";
  };

  return Point;
})();

function P(x, y) {
  return new Point(x, y);
}

var Circle = (function () {
  var Circle = function Circle(center, a) {
    this.center = center;
    if (a instanceof Point) {
      this._fromCenterAndBoundaryPoint(center, a);
    } else if (typeof a === "number") {
      this._fromCenterAndRadius(center, a);
    }
  };

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
    this.radiusSegment = new Segment(center, boundaryPoint);
    Object.defineProperties(this, {
      radius: {
        get: function () {
          return this.radiusSegment.length;
        }
      },
      radiussq: {
        get: function () {
          return this.radiusSegment.lengthsq;
        }
      }
    });
  };

  Circle.prototype.y = function (x) {
    var w = Math.abs(x - this.center.x);
    if (w > this.radius) return null;
    if (w === this.radius) return P(x, this.center.y);

    var h = Math.sqrt(this.radius * this.radius - w * w);
    return [this.center.y + h, this.center.y - h];
  };

  Circle.prototype.toString = function () {
    return "Circle[" + this.center.toString() + ";" + this.radius + "]";
  };

  return Circle;
})();

var Line = (function () {
  var Line = function Line(p1, p2) {
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
      }
    });
  };

  Line.prototype.y = function (x) {
    if ((this.dx === 0) || (this._clip && (Math.min(this._p[0].x, this._p[1].x) > x || Math.max(this._p[0].x, this._p[1].x) < x))) return null;else return this._p[0].y + (x - this._p[0].x) * (this.dy) / (this.dx);
  };

  Line.prototype.x = function (y) {
    if ((this.dy === 0) || (this._clip && (Math.min(this._p[0].y, this._p[1].y) > y || Math.max(this._p[0].y, this._p[1].y) < y))) return null;else return this._p[0].x + (y - this._p[0].y) * (this.dx) / (this.dy);
  };

  Line.prototype.toString = function () {
    return "Line[" + this._p[0].toString() + ";" + this._p[0].toString() + "]";
  };

  return Line;
})();

var Segment = (function (Line) {
  var Segment = function Segment(p1, p2) {
    Line.call(this, p1, p2);
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
          return this.dx * this.dx + this.dy * this.dy;
        }
      },

      length: {
        get: function () {
          return Math.sqrt(this.lengthsq);
        }
      }
    });
  };

  _extends(Segment, Line);

  Segment.prototype.toString = function () {
    return "Segment" + Line.prototype.toString.call(this);
  };

  Segment.clip = function (bounds, line) {
    var _ref = _toArray(line._p);

    var p1 = _ref[0];
    var p2 = _ref[1];


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

    var clipped = new Segment(p1, p2);
    clipped.parent = line;
    return clipped;
  };

  return Segment;
})(Line);

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
      return equal(o1.m, o2.m) && equal(o1.y(0), o2.y(0));
    }

    // fallback to object equality
    return o1 === o2;
  };
}

module.exports = {
  P: P,
  Point: Point,
  Circle: Circle,
  Segment: Segment,
  Line: Line,
  equalWithin: equalWithin
};

},{}],5:[function(require,module,exports){
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

    circles.selectAll("circle").attr("cx", function (d) {
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

    lines.selectAll("line").attr("x1", endpoint(0, "x")).attr("y1", endpoint(0, "y")).attr("x2", endpoint(1, "x")).attr("y2", endpoint(1, "y"));

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
},{"./model":4}],6:[function(require,module,exports){
(function (global){
"use strict";

var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

var _ref = require("./intersection");

var Intersection = _ref.Intersection;
var intersect = _ref.intersect;
var _ref2 = require("./model");

var Point = _ref2.Point;
var Line = _ref2.Line;
var Segment = _ref2.Segment;
var Circle = _ref2.Circle;
var equalWithin = _ref2.equalWithin;



function addClass(obj, klass) {
  obj.classes = obj.classes || d3.set();
  obj.classes.add(klass);
}

var Scene = (function () {
  var Scene = function Scene(bounds) {
    this.bounds = bounds;
    this.bounds.width = this.bounds.right - this.bounds.left;
    this.bounds.height = this.bounds.bottom - this.bounds.top;

    this._lastSceneId = 0;
    this._objects = d3.map();
    this._intersections = d3.map();
    this.equal = equalWithin(Math.sqrt(2));
    this.log = [];
  };

  Scene.prototype.P = function (index) {
    return this.points()[index];
  };

  Scene.prototype.points = function () {
    return this._objects.values().filter(function (o) {
      return o instanceof Point;
    });
  };

  Scene.prototype.objects = function () {
    return this._objects.values();
  };

  Scene.prototype.contains = function (obj) {
    var _this = this;
    return this._objects.values().some(function (p) {
      return _this.equal(p, obj);
    });
  };

  Scene.prototype.add = function (object) {
    if (this._objects.has(object._sceneId) || this.contains(object)) {
      return this;
    }

    object._sceneId = this._lastSceneId++;
    this._objects.set(object._sceneId, object);
    if (this._currentTag) addClass(object, this._currentTag);
    if (!(object instanceof Point)) {
      this.updateIntersections();
    } else if (object.free) {
      addClass(object, "free-point");
    }
    return this;
  };

  Scene.prototype.point = function (x, y) {
    return this.add(new Point(x, y));
  };

  Scene.prototype.circle = function (centerId, boundaryId) {
    return this.add(new Circle(this.P(centerId), this.P(boundaryId)));
  };

  Scene.prototype.segment = function (id1, id2) {
    return this.add(new Segment(this.P(id1), this.P(id2)));
  };

  Scene.prototype.line = function (id1, id2) {
    return this.add(new Line(this.P(id1), this.P(id2)));
  };

  Scene.prototype.group = function (tag) {
    this._currentTag = tag;
    return this;
  };

  Scene.prototype.updateIntersections = function () {
    var _this2 = this;
    // key for the _intersections map, which we use to identify Intersection
    // objects as equivalent between updates (so that we can mutate rather
    // than replace them).  Would be nice to do this with immutable approach,
    // but we'd then need to keep a tree of dependent shapes -- e.g., a
    // circle is centered on an intersection point.
    var objectId = function (o) {
      return (!o._sceneId && o.parent) ? objectId(o.parent) : o._sceneId;
    };
    var mapkey = function (intersection, index) {
      return intersection.objects.map(function (o) {
        return objectId(o);
      }).sort().join(":") + "[" + index + "]";
    };

    var finite = this._objects.values().filter(function (obj) {
      return !(obj instanceof Point);
    }).map(function (obj) {
      return (obj instanceof Line) ? Segment.clip(_this2.bounds, obj) : obj;
    });
    var updated = [];
    for (var i = 0; i < finite.length; i++) {
      for (var j = 0; j < i; j++) {
        (function () {
          // calculate intersections for this pair of points.
          var _points = intersect(finite[i], finite[j]);

          // could have more than one intersection; process each one.
          _points.forEach(function (p, k) {
            var key = mapkey(p, k);

            // "Snap" coordinates to the first existing point that is indistinguishable.
            _this2._snapPoint(p);

            // update existing or add new intersection.
            var existing = _this2._intersections.get(key);
            if (existing) {
              for (prop in p) existing[prop] = p[prop];
              p = existing;
            } else {
              _this2._intersections.set(key, p);
              p._intersectionMapKey = key;
            }

            _this2.add(p);
            updated.push(key);
          });
        })();
      }
    }

    // remove stale ones from the map
    if (updated.length < this._intersections.size()) {
      this._intersections.keys().filter(function (key) {
        return updated.indexOf(key) < 0;
      }).forEach(function (key) {
        return _this2._intersections.remove(key);
      });
    }

    // remove stale ones from the scene
    this._objects.values().filter(function (o) {
      return (o instanceof Intersection) && !_this2._intersections.has(o._intersectionMapKey);
    }).forEach(function (point) {
      return _this2._objects.remove(point._sceneId);
    });

    this._intersections.values().forEach(function (p, i) {
      addClass(p, "intersection-point");
    });
  };

  Scene.prototype._snapPoint = function (p) {
    var _points2 = this.points();
    for (var j = 0; j < _points2.length; j++) {
      if (this.equal(_points2[j], p)) {
        p.x = _points2[j].x;
        p.y = _points2[j].y;
        return;
      }
    }
  };

  Scene.prototype.logState = function (label) {
    var self = this;
    var _objects = this._objects.values();
    var _points3 = this.points();

    function print(object, short) {
      var n = "[" + object._sceneId + "]";

      if (object instanceof Point) return n + (short ? "" : (object.toString() + (object.objects || []).map(function (o) {
        return o._sceneId;
      }).join(",")));else if (object instanceof Circle) return n + "circle(" + print(object.center, true) + " - " + print(object.boundaryPoint, true) + ")";else if (object instanceof Line) return n + ((object instanceof Segment) ? "segment" : "line") + "(" + print(object._p[0], true) + " - " + print(object._p[1], true) + ")";

      return object.toString();
    }

    var state = {
      label: label,
      time: (new Date()).toString(),
      objects: _objects.map(function (o) {
        return print(o);
      }),
      intersections: this._intersections.keys()
    };
    this.log.push(state);
  };

  return Scene;
})();

module.exports = Scene;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./intersection":3,"./model":4}],7:[function(require,module,exports){
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