'use strict'

let test = require('tape');

let {P, Circle, Line, Segment} = require('../lib/model'),
    {intersect} = require('../lib/intersection'),
    {distance} = require('../lib/calc');

test('circle-circle', function(t) {
  
  let c1 = new Circle(P(0,0), P(10,0));
  let c2 = new Circle(P(5,0), P(15, 0));
  let c3 = new Circle(P(20,0), P(10, 0));
  
  // 2 intersections
  let ints12 = intersect(c1, c2);
  t.equal(ints12.length, 2);
  t.ok(c1.contains(ints12[0]));
  t.ok(c1.contains(ints12[1]));
  
  // tangent === 1 intersection
  let ints13 = intersect(c1, c3);
  t.equal(ints13.length, 1);
  t.equal(distance(ints13[0], P(10, 0)), 0);
  
  // 0 intersections
  let noInts = intersect(c1, new Circle(P(50,50), 10));
  t.equal(noInts.length, 0);
  
  t.end();
});


test('circle-segment: 2 intersections', function(t) {

  // 2 intersections
  let circle = new Circle(P(0,0),5),
      segment = new Segment(P(-30,-40), P(30,40));

  let ints = intersect(circle,segment);
  t.equal(ints.length, 2)
  t.ok(circle.contains(ints[0]));
  t.ok(circle.contains(ints[1]));
  t.ok(segment.contains(ints[0]));
  t.ok(segment.contains(ints[1]));
  t.end();
})

test('circle-segment: 1 intersection: segment stops in interior', function(t) {
  let circle = new Circle(P(0,0),5),
      segment = new Segment(P(0,0), P(30,40));
  
  let ints = intersect(circle,segment);
  t.equal(ints.length, 1)
  t.ok(circle.contains(ints[0]));
  t.ok(segment.contains(ints[0]));
  t.end();
});

test('circle-segment: 1 intersection: tangent', function(t) {
  let circle = new Circle(P(0,0),5),
    segment = new Segment(P(5,-5), P(5, 5));
  
  let ints = intersect(circle, segment);
  t.equal(ints.length, 1);
  t.ok(circle.contains(ints[0]));
  t.ok(segment.contains(ints[0]));
  
  t.end();
})

test('circle-segment: vertical line', function(t) {
  let circle = new Circle(P(0,0),5),
    segment = new Segment(P(0,0), P(0, 10));
  
  let ints = intersect(circle, segment);
  t.equal(ints.length, 1);
  t.ok(circle.contains(ints[0]));
  t.ok(segment.contains(ints[0]));
  
  t.end();
})

test('circle-segment: horizontal line', function(t) {
  let circle = new Circle(P(0,0),5),
  segment = new Segment(P(0,0), P(10, 0));
  
  let ints = intersect(circle, segment);
  t.equal(ints.length, 1);
  t.ok(circle.contains(ints[0]));
  t.ok(segment.contains(ints[0]));
  
  t.end();
})


test('segment-segment: one intersection', function(t) {
  let s1 = new Segment(P(1,2), P(10, 30)),
      s2 = new Segment(P(1, 15), P(10, -1));
      
  let ints = intersect(s1, s2);
  t.equal(ints.length, 1);
  t.ok(s1.contains(ints[0]));
  t.ok(s2.contains(ints[0]));

  t.end();
})

test('segment-segment: zero intersections', function(t) {
  let s1 = new Segment(P(1,2), P(10, 30)),
  s2 = new Segment(P(2, 3), P(11, 32));
  
  let ints = intersect(s1, s2);
  t.equal(ints.length, 0);
  t.end();
})

test('segment-segment: horizontal', function(t) {
  let s1 = new Segment(P(1,2), P(12, 30)),
      s2 = new Segment(P(5, -5), P(5, 30));
  
  let ints = intersect(s1, s2);
  t.equal(ints.length, 1);
  t.ok(s1.contains(ints[0]));
  t.ok(s2.contains(ints[0]));
  t.end();
})


test('segment-segment: vertical', function(t) {
  let s1 = new Segment(P(1,2), P(10, 30)),
  s2 = new Segment(P(-5, 5), P(15, 5));
  
  let ints = intersect(s1, s2);
  t.equal(ints.length, 1);
  t.ok(s1.contains(ints[0]));
  t.ok(s2.contains(ints[0]));
  t.end();
  
})
