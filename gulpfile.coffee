
fs = require('fs')
path = require('path')

gulp = require('gulp')
clean = require('gulp-clean')
header  = require('gulp-header')
footer = require('gulp-footer')
rename = require('gulp-rename')
source = require('vinyl-source-stream')
# js
browserify = require('browserify')
to5 = require('6to5-browserify')
# css
sass = require('gulp-sass')
autoprefixer = require('gulp-autoprefixer')
minifycss = require('gulp-minify-css')
### preview ###
browserSync = require('browser-sync')

pkg = require('./package.json')

# Source and build paths.
paths=
  sass: 'sass/**/*.scss'
  js: 'lib/**/*.js'
  vendorjs: 'vendor/**/*.js'
  html: 'html/**/*.html'
  assets: 'assets'
  build: 'build'
paths.dest=
  css: path.join(paths.build, 'css')
  vendorjs: path.join(paths.build, 'js', 'vendor')
  js: path.join(paths.build, 'js')
  
# Banner
banner = """/*!
 * <%= pkg.name %>
 * <%= pkg.url %>
 * Copyright #{new Date().getFullYear()} <%= pkg.author %>.
 */
"""
# HTML5 Boilerplate header and footer
htmlHeader = fs.readFileSync('h5bp-header.html').toString('utf8')
htmlFooter = fs.readFileSync('h5bp-footer.html').toString('utf8')
# Site header and footer
siteHeader = fs.readFileSync('site-header.html').toString('utf8')
siteFooter = fs.readFileSync('site-footer.html').toString('utf8')

gulp.task 'copy', ->
  gulp.src(paths.assets+'/**/*', base: paths.assets)
  .pipe gulp.dest(paths.build)
  .pipe browserSync.reload({stream: true})
  
gulp.task 'clean', ->
  gulp.src(paths.build, {read: false})
  .pipe clean()
  
# Wrap each html file with HTML5 Boilerplate.
gulp.task 'html', ->
  gulp.src(paths.html)
  .pipe header(siteHeader, {pkg: pkg})
  .pipe footer(siteFooter, {pkg: pkg})
  .pipe header(htmlHeader, {pkg: pkg, now: new Date()})
  .pipe footer(htmlFooter, {pkg: pkg})
  .pipe gulp.dest(paths.build)
  .pipe browserSync.reload({stream: true})

gulp.task 'sass', ->
  gulp.src(paths.sass)
  .pipe sass(errLogToConsole: true)
  .pipe autoprefixer(['> 1%', 'last 2 versions', 'IE 8'])
  .pipe gulp.dest(paths.dest.css)
  .pipe browserSync.reload({stream: true})
  .pipe minifycss()
  .pipe rename({ suffix: '.min' })
  .pipe header(banner, {pkg: pkg})
  .pipe gulp.dest(paths.dest.css)
  .pipe browserSync.reload({stream: true})
  
gulp.task 'js', (cb)->
  gulp.src(paths.vendorjs)
  .pipe gulp.dest(paths.dest.vendorjs)
  .pipe browserSync.reload({stream: true, once: true})
  
  browserify(debug: true)
  .transform(to5)
  .add('./main.js')
  .bundle()
  .on('error', (err)->
    console.error("Error", err)
    cb()
    this.emit('end')
  )
  .pipe(source('main.js'))
  .pipe gulp.dest(paths.dest.js)
  .pipe browserSync.reload({stream: true, once: true})
  
gulp.task 'bs-init', ->
  browserSync.init
    server:
      baseDir: paths.build
      
gulp.task('buildall', ['sass', 'js', 'html', 'copy'], ->)

gulp.task('build', ['clean'], ->
  gulp.start 'buildall'
)

gulp.task('default', ['sass', 'js', 'html', 'copy', 'bs-init'], ->
  gulp.watch(paths.sass, ['sass'])
  gulp.watch([paths.js, './main.js'], ['js'])
  gulp.watch(paths.html, ['html'])
  gulp.watch(paths.assets+'/**/*', ['copy'])
)
  
  
