/* jshint esversion: 6 */

var gulp = require('gulp');
var browserSync         = require('browser-sync');
var sass                = require('gulp-sass');
var postcss             = require('gulp-postcss');
var autoprefixer        = require('autoprefixer');
var cssnano             = require('cssnano');
var del                 = require('del');
var nunjucks            = require('gulp-nunjucks-render');
var htmlhint            = require('gulp-htmlhint');
var concat              = require('gulp-concat');
var uglify              = require('gulp-uglify');
var jshint              = require('gulp-jshint');
var ftp                 = require('gulp-sftp-up4');
var argv                = require('yargs').argv;

const DEST_ROOT = 'dist';
const SRC_ROOT = 'src';

const paths = {
  styles: {
    src: `${SRC_ROOT}/scss/*.scss`,
    dest: `${DEST_ROOT}/css`,
  },
  html: {
    src: [`${SRC_ROOT}/*.html`, `${SRC_ROOT}/**/*.html`, `!${SRC_ROOT}/templates/`],
    templates: `${SRC_ROOT}/templates`,
    dest: `${DEST_ROOT}`,
    test: [`${DEST_ROOT}/*.html`, `${DEST_ROOT}/*/*.html`]
  },
  scripts: {
    src: `${SRC_ROOT}/**/*.js`,
    dest: `${DEST_ROOT}/scripts`
  },
  images: {
    src: `${SRC_ROOT}/images/**`,
    dest: `${DEST_ROOT}/images`
  },
  data: {
    src: `${SRC_ROOT}/data/**`,
    dest: `${DEST_ROOT}/data`
  }
};

function buildCss() {
  return gulp.src(paths.styles.src)
    .pipe(sass()).on("error", sass.logError)
    // Use postcss with autoprefixer and compress the compiled file using cssnano
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(gulp.dest(paths.styles.dest))
    // Add browsersync stream pipe after compilation
    .pipe(browserSync.stream());
}

function buildImages() {
  return gulp.src(paths.images.src)
    .pipe(gulp.dest(paths.images.dest));
}

function copyData() {
  return gulp.src(paths.data.src)
    .pipe(gulp.dest(paths.data.dest));
}

// We build HTML using `nunjucks` package by inserting templates (pretty same
// as being used by Django).
function buildHtml() {
  return gulp.src(paths.html.src)
    .pipe(nunjucks({path: paths.html.templates}))
    .pipe(gulp.dest(paths.html.dest))
    .pipe(browserSync.stream());
}

// Since HTML is being built from pieces, we validate the final result only.
// For this reason, we use pretty same path for gulp.src, as we used to
// output the results from 'html' task.
function testHtml() {
  return gulp.src(paths.html.test)
    .pipe(htmlhint())
    .pipe(htmlhint.failOnError());
}

// We combine all our custom scripts into single 'app.min.js', which is
// then uglified and written to output.
function buildScripts() {
  return gulp.src(paths.scripts.src)
    .pipe(concat('app.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(browserSync.stream());
}

// Since uglified version is hard to analyze, we pass original scripts to
// JSHint for validation.
function testScripts() {
  return gulp.src(paths.scripts.src)
    .pipe(jshint())
    .pipe(jshint.reporter())
    .pipe(jshint.reporter('fail'));
}

// Launch `browsersync` and setup watches.
function serve() {
  browserSync.init({
    server: DEST_ROOT
  });

  gulp.watch(paths.styles.src, buildCss);
  gulp.watch(paths.html.src, buildHtml);
  gulp.watch(paths.html.templates + '/**', buildHtml);
  gulp.watch(paths.scripts.src, buildScripts);
  gulp.watch(paths.images.src + '/**', buildImages);
  gulp.watch(paths.data.src + '/**', copyData);
}

// Remove everything in 'dist' folder.
function clean(cb) {
  del([`${DEST_ROOT}/*`]);
  cb();
}

function deploy(cb) {
  return gulp.src('dist/**')
    .pipe(ftp({
      host: "sftp.selcdn.ru",
      remotePath: '2019.dccn.ru/',
      auth: "selcdn"
    }));
}

exports.build = gulp.parallel(
  buildCss, buildHtml, buildScripts, buildImages, copyData
);
exports.test = gulp.series(testHtml, testScripts);
exports.clean = clean;
exports.serve = serve;
exports.default = serve;
exports.deploy = deploy;
