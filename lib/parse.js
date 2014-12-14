let parser = require('euclid-parser');

module.exports = function(scene, text, cb) {
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
      case 'group':
        scene.group(item.name);
        return item.name;
        break;
      case 'point':
        scene.point(item.name, item.x, item.y);
        break;
      case 'line':
        scene.line(item.name, resolve(stack, item.points[0]), resolve(stack, item.points[1]));
        break;
      case 'segment':
        scene.segment(item.name, resolve(stack, item.points[0]), resolve(stack, item.points[1]));
        break;
      case 'circle':
        scene.circle(item.name, resolve(stack, item.center), resolve(stack, item.boundaryPoint));
        break;
      case 'intersection':
        let which = 0;
        if (item.which && item.which.op === 'not')
          which = scene.isnt(item.which.args[0]);
        scene.intersection(item.name, item.objects[0].name, item.objects[1].name, which)
        break;
    }

    return scene.last().name;
  }

  let parsedObjects = [],
    lines = text.split('\n');

  try {
    /* parse "[grouping]" statements directly, and geometry declarations using
     * the euclid-parser parser. */
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].trim();
      if (/^\[.*\]$/.test(lines[i]))
        parsedObjects.push({
          type: 'group',
          name: lines[i].slice(1, -1)
        });
      else if (lines[i].length > 0)
        parsedObjects.push(parser.parse(lines[i])[0]);
    }

    /* remove from scene any existing objects that weren't declared in the parsed text */
    let parsedNames = parsedObjects.map(o => o.name);
    scene._objects.keys()
      .filter(name => parsedNames.indexOf(name) < 0)
      .forEach(name => scene._objects.remove(name));

    /* now handle the actual parsed objects */
    for (let i = 0; i < parsedObjects.length; i++) {
      parse([], parsedObjects[i]);
    }

    if (cb) cb(true);
  } catch (e) {
    console.error(e.stack);
    if (cb) cb(null, e);
  }
}
