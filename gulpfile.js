'use strict';

var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var del = require('del');
var gulp = require('gulp');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sassLint = require('gulp-sass-lint');
var sourcemaps = require('gulp-sourcemaps');
var vinylPaths = require('vinyl-paths');


var autoprefixerOptions = [
    'last 2 version',
    'safari 5',
    'ie 8', 'ie 9',
    'opera 12.1'
];

var sassIncludes = ['node_modules'];
var sassInput = 'static/css/*.scss';
var sassWatch = 'static/css/**/*.scss';
var sassOutput = 'static/css/';
var sassSourcemapOutput = '/maps/';
var sassSourceRoot = '';
var sassOptions = {
    includePaths: sassIncludes,
    style: 'expanded',
    errLogToConsole: true
};

var templateWatch = 'templates/**/*.html';


/* Gulp instructions start here */
gulp.task('browser-sync', function() {
    return browserSync.init({
        proxy: "web:5000"
    });
});

gulp.task('sass', function() {
    return gulp.src(sassInput)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass(sassOptions).on('error', sass.logError))
        .pipe(autoprefixer(autoprefixerOptions))
        .pipe(gulp.dest(sassOutput))
        .pipe(sourcemaps.write(sassSourcemapOutput, {
          sourceRoot: sassSourceRoot
        }))
        .pipe(gulp.dest(sassOutput))
        .pipe(browserSync.stream())
});

gulp.task('sass:clean', function() {
    return gulp.src(sassOutput+'*.css')
        .pipe(vinylPaths(del))
        .pipe(gulp.dest('dist'));
});

gulp.task('sass:lint', function() {
    return gulp.src(sassWatch)
        .pipe(sassLint())
        .pipe(sassLint.format())
        .pipe(sassLint.failOnError());
});

gulp.task('sass:watch', function() {
    gulp.watch([sassInput, sassWatch], ['sass']);
});

gulp.task('template:watch', function() {
    gulp.watch([templateWatch], function (file) {
        return gulp.src(file.path)
        .pipe(browserSync.stream())
    });
});

gulp.task('watch', ['sass:watch', 'template:watch']);
gulp.task('dev', ['watch', 'browser-sync']);

gulp.task('test', ['sass:lint']);
gulp.task('build', ['test', 'sass']);
