
var test = require('tape'),
    parser = require('../lib/parse'),
    Scene = require('../lib/scene');



test('parses simple scene', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  }),
  parse = parser(scene);
  
  var input = [
    'let a = (1,0)',
    'let b = (2, 3)',
    'let c = (5, 9)',
    'let d be the segment joining a and b',
    'let e be a circle through b centered at a',
    'let f be the line determined by b and c'
  ];

  parse(input.join('\n'), function(res, err) {
    
    if(err) { throw(err); }
    
    t.ok(scene.get('a'), 'point a');
    t.ok(scene.get('b'), 'point b');
    t.ok(scene.get('c'), 'point c');
    
    t.equal(scene.get('e').center, scene.get('a'), 'circle e center === point a')
    t.ok(scene.get('e').contains(scene.get('b')), 'circle e contains point b')
    
    t.end();
  });
  
});
