# Euclid

Euclidean geometry in javascript.
[Here's](http://anandthakker.github.io/euclid/) a demo; [here's](http://anandthakker.github.io/euclid/background.html) another one.

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

or a browser standalone(ish) script (depends on `d3` and `lodash` to be 
loaded already).

```html
<script src="js/vendor/d3.min.js"></script>
<script src="js/vendor/lodash.min.js"></script>
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
  
scene.point(width/7*3, height/2) // add a couple of free points.
  .point(width/7*4, height/2)
  // add circle centered at point 0, with point 1 on its circumference.
  .circle(0, 1)
  .circle(1, 0)
  // now that two overlapping circles exist, their intersections are in the
  // scene as points 2 and 3.
  .circle(2, 0)
  .circle(4, 0)
  .circle(6, 0)
  .circle(8, 0)
  .circle(3, 0)
  // tag subsequent objects with string 'hex', used by renderer to add
  // arbitrary classes to svg objects.
  .group('hex')
  .segment(1,2)
  .segment(2,4)
  .segment(4,6)
  .segment(6,8)
  .segment(8,3)
  .segment(3,1)


// render using d3.
var render = geom.renderer(scene, document.querySelector('svg'));
render();
```
