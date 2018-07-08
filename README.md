# Euclid [![Build Status](https://travis-ci.org/anandthakker/euclid.svg?branch=master)](https://travis-ci.org/anandthakker/euclid) [![JS.ORG](https://img.shields.io/badge/js.org-euclid-ffb400.svg?style=flat-square)](http://js.org)

Euclidean geometry in javascript.
[Here's](http://anandthakker.github.io/euclid/) a demo; [here's](http://anandthakker.net) another one (mess with it by clicking "Play with the geometry background!" at the bottom).

**NOTE:** Still very preliminary / experimental.

```bash
git clone https://github.com/anandthakker/euclid.git
cd euclid
npm install
gulp
```

# Usage

### Load It:

Add `dist/geometry.css` for the basic SVG styles.
```html
<link rel="stylesheet" href="geometry.css">
```

Put an `<svg>` element somewhere.
```html
<svg class="geometry-scene" viewbox="0 0 800 800"></svg>
```

Pull in the javascript, either as a node module...

```javascript
var geom = require('euclid');
```

or a browser standalone(ish) script (depends on `d3` to be 
loaded already).

```html
<script src="js/vendor/d3.min.js"></script>
<script src="js/geometry.js"></script> <!-- exposes geom as a global -->
```

### Use It:

And then 
``` javascript
var scene = new geom.Scene({
  left: 0,
  top: 0,
  right: 1000,
  bottom: 1000
});
  
scene
  .point('A', width/7*3, height/3) // add a couple of free points.
  .poinnt('B', width/7*5, height/3)
  .segment('S', 'A', 'B')

  // add circle centered at point 'A', with point 'B' on its circumference.
  .circle('M', 'A', 'B')
  .circle('N', 'B', 'A')

  // tag subsequent objects with string 'layer2', used by renderer to add
  // arbitrary CSS classes to svg objects.
  .group('layer2')
  
  // let C and D be the two intersections of circles M and N
  .intersection('C', 'M', 'N', 0)
  .intersection('D', 'M', 'N', 1)
  .line('T', 'A', 'C')
  .segment('U', 'A', 'D')
  
  // let E be the intersection of line T and circle M that *isn't* equivalent to point C.
  .intersection('E', 'T', 'M', scene.isnt('C') )
  .segment('V', 'E', 'B')
  .intersection('F', 'V', 'U')
  .segment('W', 'F', 'C')
  .intersection('W', 'S')
  

// render using d3.
var render = geom.renderer(scene, document.querySelector('svg'));
render();
```
