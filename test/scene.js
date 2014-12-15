
var test = require('tape'),
    Scene = require('../lib/scene'),
    model = require('../lib/model');


test('build a simple scene', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  scene
  .point('A', 200, 500)
  .point('B', 600, 500)
  .segment('S', 'A', 'B')
  .circle('M', 'A', 'B')
  .circle('N', 'B', 'A')
  .intersection('C', 'M', 'N', 0)
  .intersection('D', 'M', 'N', 1)
  .line('T', 'A', 'C')
  .segment('U', 'A', 'D')
  .intersection('E', 'T', 'M', scene.isnt('C') )
  .segment('V', 'E', 'B')
  .intersection('F', 'V', 'U')
  .segment('W', 'F', 'C')
  .intersection('W', 'S')

  t.equal(scene.objects().length, 14, 'add all the objects');
  t.end();
});


test('generates a name when adding an unnamed object', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  scene.point(null, 10, 100);
  t.equal(scene.last().x, 10, 'x');
  t.equal(scene.last().y, 100, 'y');
  t.ok(scene.last().name, 'name');
  t.end();
});

test('refuses to add object if a geometrically equivalent one already exists with a different name', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  scene.point('a', 10, 10);
  scene.point('b', 10, 10);
  
  t.ok(scene.get('a'), 'point a');
  t.notOk(scene.get('b'), 'no point b');
  t.end();
});

test('refuses to add object if one with the same name but a different type already exists', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  scene.point('a', 10, 10);
  scene.point('b', 20, 20);
  scene.line('a', 'a', 'b');
  
  t.ok(scene.get('a') instanceof model.Point, 'a is still a Point');
  t.notOk(scene.get('a').m, 'a doesnt have line-like properties');
  t.end();
})

test('updates existing object if attempt is made to add one with the same name and type', function(t) {
  var scene = new Scene({
    left: 0,
    right: 1000,
    top: 0,
    bottom: 1000
  });
  
  scene.point('a', 10, 10);
  scene.point('b', 20, 20);
  scene.point('c', 20, 15);
  scene.line('l', 'a', 'b');
  scene.line('l', 'a', 'c');
  
  t.equal(scene.get('l').m, 0.5);
  
  scene.point('c', 20, 0);
  
  t.equal(scene.get('l').m, -1);
  
  t.end();
});
