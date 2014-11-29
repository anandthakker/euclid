
# Setup

Install [Node.js][1] then:

```bash
git clone [this repo]
cd [this repo dir]
npm install
```

# Development

In the project folder: 
```bash
./gulp
```

This will start watching the files and pop open a browser pointed at the local
copy of the site.  Changes you make to the source files will prompt any browsers
you have pointed at it to reload via [browserSync][2].

# Production

To build for production:
```bash
./gulp build
```

The built site will be under the `build` directory.

# Source Files

- *site-footer.html*, *site-header.html*: common header and footer for every page.
- *h5bp-footer.html*, *h5bp-header.html*: [HTML5Boilerplate (h5bp)][3] stuff for every page.
- *html/* - HTML file structure.  Every .html file in here gets wrapped up in the
  aforementioned headers and footers.
- *sass/*
  - *_site.scss* - overall site styles
  - *pages/* - per-page styles
  - *_helpers.scss* - handy mixins and placeholders
  - *normalize.scss* - CSS reset from [h5bp][3]
  - *_base.scss* - some base styles (essentially a further reset on top of `normalize`)
- *js/main.js* - site-specific js.
- *js/plugins.js* - copy-pasted js plugins.
- *vendor/* - 3rd-party code/assets (e.g., jquery, modernizr, etc)

[1]: http://nodejs.org/download/
[2]: http://www.browsersync.io/
[3]: http://html5boilerplate.com/
