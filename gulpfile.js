
var plumber = require('gulp-plumber'),
  sourcemaps = require('gulp-sourcemaps'),
  gulp = require('gulp'),
  livereload = require('gulp-livereload'),
  concat = require('gulp-concat'),
  runSeq = require('run-sequence');

gulp.task('reload', function () {
    livereload.reload();
});

gulp.task('buildJS', function () {
    return gulp.src(['./public/app/app.js', './public/app/**/*.js'])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(concat('main.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public'));
});

gulp.task('default', function () {

    gulp.start('buildJS');

    // Run when anything inside of browser/js changes.
    gulp.watch('public/app/**/*.js', function () {
        runSeq('buildJS', 'reload');
    });

    // Reload when a template (.html) file changes.
    gulp.watch(['browser/**/*.html', 'server/app/views/*.html'], ['reload']);


    livereload.listen();

});
