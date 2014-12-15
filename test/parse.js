
var test = require('tape'),
    parse = require('../lib/parse'),
    Scene = require('../lib/scene');



test('parses simple scene', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
    
  var input = [
    'let a = (0,0)',
    'let b = (10, 0)',
    'let c = (5, 5)',
    'let d be the segment joining a and b',
    'let e be a circle through b centered at a',
    'let f be the line determined by b and c'
  ];

  parse(scene, input.join('\n'), function(res, err) {
    if(err) { throw(err); }
    
    t.ok(scene.get('a'), 'point a');
    t.ok(scene.get('b'), 'point b');
    t.ok(scene.get('c'), 'point c');
    
    t.equal(scene.get('e').center, scene.get('a'), 'circle e center === point a')
    t.ok(scene.get('e').contains(scene.get('b')), 'circle e contains point b')
    t.end();
  });
  
});


test('inline literals', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  var input = [
  'let a = (0,0)',
  'let b = (500, 500)',
  'let c = (0, 500)',
  'let d = (500, 0)',
  'let e = intersection of line a-b and line c-d'
  ];
  
  parse(scene, input.join('\n'), function(res, err) {
    if(err) { throw(err); }
    t.equal(scene.get('e').x, 250);
    t.equal(scene.get('e').y, 250);
    t.end();
  });
});

test('inline literals 2', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  var input = [
  'let a = (0,0)',
  'let b = (500, 500)',
  'let c = (0, 500)',
  'let d = (500, 0)',
  'let f = the circle through point a centered at the intersection of line a-b and line c-d'
  ];
  
  parse(scene, input.join('\n'), function(res, err) {
    if(err) { throw(err); }
    t.equal(scene.get('f').center.x, 250);
    t.equal(scene.get('f').center.y, 250);
    t.end();
  });
  
})
