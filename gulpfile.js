'use strict';

// Install: you must install gulp both globally *and* locally.
// Make sure you `$ npm install -g gulp`

/**
 * Dependencies
 */

var $             = require('gulp-load-plugins')({ lazy: true });
var psi           = require('psi');
var del           = require('del');
var gulp          = require('gulp');
var pngquant      = require('imagemin-pngquant');
var terminus      = require('terminus');
var runSequence   = require('run-sequence');
var config        = require('./config/config.js');

/**
 * Banner
 */

var pkg = require('./package.json');
var banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''
].join('\n');

/**
 * Paths
 */

var paths = {
  clean: [
    // 'public/js/**/*.js',
    'public/js/**/*.map',
    'public/js/**/*.min.js',
    'public/css/**/*.css',
    'public/css/**/*.min.css',
    // ! not...
    '!public/js/main.js',
    '!public/js/datepicker.js',
  ],
  js: [
    'public/lib/moment/min/moment.min.js',
    'public/lib/validator-js/validator.min.js',
    // ============= Bootstrap  ================
    // Enable/disable as needed but only turn on
    // .js that is needed on *every* page. No bloat!
    // =========================================
    'public/lib/bootstrap/js/transition.js',
    'public/lib/bootstrap/js/alert.js',
    'public/lib/bootstrap/js/button.js',
    'public/lib/bootstrap/js/carousel.js',
    'public/lib/bootstrap/js/collapse.js',
    'public/lib/bootstrap/js/dropdown.js',
    'public/lib/bootstrap-select/js/bootstrap-select.js',
    'public/lib/bootstrap-treeview/dist/bootstrap-treeview.min.js',
    'public/lib/bootstrap-html5sortable/jquery.sortable.min.js',
    'public/lib/bootstrap/js/modal.js',
    'public/lib/bootstrap/js/tooltip.js',
    'public/lib/bootstrap/js/popover.js',
    'public/lib/bootstrap/js/scrollspy.js',
    'public/lib/bootstrap/js/tab.js',
    'public/lib/bootstrap/js/affix.js',
    // =========================================
    'public/lib/fastclick/lib/fastclick.js',
    'public/lib/bootstrap3-typeahead/bootstreap3-typeahead.min.js',
    'public/lib/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
    'public/js/main.js'
  ],
  lint: [
    'config/**/*.js',
    'test/**/*.js',
    'controllers/**/*.js',
    'models/**/*.js',
    'app.js',
    'app_cluster.js',
    'gulpfile.js'
  ],
  less: [
      'less/main.less',
      'less/page-colors.less',
      'less/page-dashboard.less',
      'less/page-privacy.less',
      'less/page-react.less',
      'less/resources-margin.less'
  ]
};

/**
 * Clean
 */

gulp.task('clean', function () {
  return del(paths.clean);
});

/**
 * Process CSS
 */

gulp.task('styles', function () {
  return gulp.src(paths.less)               // Read in Less files
	.pipe($.less({ strictMath: true,
		       relativeUrls: true }))     // Compile Less files
    .pipe($.autoprefixer({                  // Autoprefix for target browsers
      browsers: ['last 2 versions'],
      cascade: true
    }))
    .pipe($.csscomb())                      // Coding style formatter for CSS
    .pipe($.csslint('.csslintrc'))          // Lint CSS
    .pipe($.csslint.reporter())             // Report issues
    .pipe($.rename({ suffix: '.min' }))     // Add .min suffix
    .pipe($.cssnano())                      // Minify CSS
    .pipe($.header(banner, { pkg : pkg }))  // Add banner
    .pipe($.size({ title: 'CSS:' }))        // What size are we at?
    .pipe(gulp.dest('./public/css'))        // Save minified CSS
    .pipe($.livereload());                  // Initiate a reload
});

/**
 * Process Scripts
 */

gulp.task('scripts', function () {
  return gulp.src(paths.js)                 // Read .js files
    .pipe($.concat(pkg.name + '.js'))       // Concatenate .js files
    .pipe(gulp.dest('./public/js'))         // Save main.js here
    .pipe($.rename({ suffix: '.min' }))     // Add .min suffix
    .pipe($.uglify({ outSourceMap: true })) // Minify the .js
    .pipe($.header(banner, { pkg : pkg }))  // Add banner
    .pipe($.size({ title: 'JS:' }))         // What size are we at?
    .pipe(gulp.dest('./public/js'))         // Save minified .js
    .pipe($.livereload());                  // Initiate a reload
});

/**
 * Process Images
 */

gulp.task('images', function () {
  return gulp.src('images/**/*')            // Read images
    .pipe($.changed('./public/img'))        // Only process new/changed
    /* BADBAD: this is breaking in deployment
    .pipe($.imagemin({
      progressive: true,
      optimizationLevel: 3,
      interlaced: true,
      svgoPlugins: [{ removeViewBox: false }],
      use: [pngquant()]
    }))
    */
    .pipe(gulp.dest('./public/img'));       // Write processed images
});

/**
 * JSHint Files
 */

gulp.task('lint', function () {
  return gulp.src(paths.lint)               // Read .js files
    .pipe($.jshint())                       // lint .js files
    .pipe($.jshint.reporter('jshint-stylish'));
});

/**
 * JSCS Files
 */

gulp.task('jscs', function () {
  return gulp.src(paths.lint)               // Read .js files
    .pipe($.jscs())                         // jscs .js files
    .on('error', function (e) {
      $.util.log(e.message);
      $.jscs().end();
    })
    .pipe(terminus.devnull({ objectMode: true }));
});

/**
 * Build Task
 *   - Build all the things...
 */

gulp.task('build', function (cb) {
  runSequence(
    'clean',                                // first clean
    ['lint', 'jscs'],                       // then lint and jscs in parallel
    ['styles', 'scripts', 'images'],        // etc.
    cb);
});

/**
 * Nodemon Task
 */

gulp.task('nodemon', ['build'], function (cb) {
  $.livereload.listen();
  var called = false;
  $.nodemon({
    script: 'app.js',
    verbose: false,
    env: { 'NODE_ENV': 'development', 'DEBUG': 'curatedcourses' },
    // nodeArgs: ['--debug']
    ext: 'js',
    ignore: [
      'gulpfile.js',
      'public/',
      'views/',
      'less/',
      'node_modules/'
    ]
  })
  .on('start', function () {
    setTimeout(function () {
      if (!called) {
        called = true;
        cb();
      }
    }, 3000);  // wait for start
  })
  .on('restart', function () {
    setTimeout(function () {
      $.livereload.changed('/');
    }, 3000);  // wait for restart
  });
});

/**
 * Default Task
 */

gulp.task('default', ['nodemon'], function () {
  gulp.watch(paths.less, ['styles']);
  gulp.watch(paths.js, ['scripts']);
  gulp.watch(paths.lint, ['lint', 'jscs']);
  gulp.watch('views/**/*.jade').on('change', $.livereload.changed);
});

/**
 * Run PageSpeed Insights
 */

// When using this module for a production-level build process,
// registering for an API key from the Google Developer Console
// is recommended.

var site = 'curatedcourses.org';

gulp.task('mobile', function (cb) {
  // output a formatted report to the terminal
  psi.output(site, {
    strategy: 'mobile',
    locale: 'en_US',
    threshold: 70
  }, cb);
});

gulp.task('desktop', ['mobile'], function (cb) {
  // output a formatted report to the terminal
  psi.output(site, {
    strategy: 'desktop',
    locale: 'en_US',
    threshold: 80
  }, cb);
});

gulp.task('pagespeed', ['desktop']);
