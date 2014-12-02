'use strict'

let test = require('tape');
let {P, Circle, Line, Segment} = require('../lib/geometry'),
    {Intersection} = require('../lib/intersection'),
    Scene = require('../lib/scene');


test('basic scene intersection', function(t) {
  let scene = new Scene({
    width: 1000,
    height: 1000,
    left: 0,
    top: 0,
    right: 1000,
    bottom: 1000
  });
  
  scene
  .point(500, 500)
  .point(600, 500)
  .circle(0, 1)
  .circle(1, 0);
  
  t.equal(scene.points().filter(p => p instanceof Intersection).length, 2);

  t.end();
});


test('scene adds only unique intersections', function(t) {
  let scene = new Scene({
    width: 1000,
    height: 1000,
    left: 0,
    top: 0,
    right: 1000,
    bottom: 1000
  });
  
  scene
  .point(500, 500)
  .point(600, 500)
  .circle(0, 1)
  .circle(1, 0)
  .circle(2, 1)
  .circle(4, 2);
  
  scene.points().filter(p => p instanceof Intersection)
  .sort((i1,i2) => i1.y - i2.y)
  .sort((i1,i2) => i1.x - i2.x)
  .forEach(i=>console.log(i.toString(true)));
  
  t.equal(scene.points().filter(p => p instanceof Intersection).length, 6);
  
  t.end();
});
