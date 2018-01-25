// including plugins
var gulp = require('gulp')
, minifyCss = require("gulp-minify-css")
, minifyJs = require("gulp-minify")
, uglify = require("gulp-uglify")
, rename = require("gulp-rename")
, concat = require("gulp-concat");
 
var cssFiles = ['./assets/css/*.css', '!./assets/css/*.min.css'];
var jsAdminFiles = ['./assets/js/aero/admin/*.js', '!./assets/js/aero/admin/*.min.js'];
var jsUserFiles = ['./assets/js/aero/user/*.js', '!./assets/js/aero/user/*.min.js'];
var jsApiFiles = ['./assets/js/api/*.js', '!./assets/js/api/*.min.js'];

var jsMinAdminFiles = [
    './assets/js/aero/admin/aero-admin.min.js',
    './assets/js/aero/admin/aero-guide.min.js',
    './assets/js/aero/admin/aero-step.min.js',
    './assets/js/aero/admin/aero-pathway.min.js',
    './assets/js/aero/admin/aero-role.min.js',
    './assets/js/aero/admin/aero-picker.min.js',
    './assets/js/aero/admin/aero-quiz.min.js',
    './assets/js/aero/admin/_main.min.js'
];

var jsMinUserFiles = [
    './assets/js/aero/user/aero.min.js',
    './assets/js/aero/user/aero-audit.min.js',
    './assets/js/aero/user/aero-pathway.min.js',
    './assets/js/aero/user/aero-quiz.min.js',
    './assets/js/aero/user/aero-media.min.js',
    './assets/js/aero/user/aero-step.min.js',
    './assets/js/aero/user/aero-tip.min.js',
    './assets/js/aero/user/aero-guide.min.js',
    './assets/js/aero/user/_main.min.js'
];

// Minify CSS Files
gulp.task('minify-css', function () {
    gulp.src(cssFiles) // path to your file
    .pipe(minifyCss())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('assets/css'));
});

// Minify admin
gulp.task('minify-admin-js', function () {
    gulp.src(jsAdminFiles)
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('assets/js/aero/admin'));
});

// Minify user
gulp.task('minify-user-js', function () {
    gulp.src(jsUserFiles)
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('assets/js/aero/user'));
});

// Minify api
gulp.task('minify-api-js', function () {
    gulp.src(jsApiFiles)
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('assets/js/api'));
});

// Concat admin
gulp.task('concat-user-js', function () {
    gulp.src(jsMinUserFiles)
    .pipe(concat('jumpseat.min.js'))
    .pipe(gulp.dest('assets/js/aero/user'));
});

// Concat user
gulp.task('concat-admin-js', function () {
    gulp.src(jsMinAdminFiles)
    .pipe(concat('jumpseat-auth.min.js'))
    .pipe(gulp.dest('assets/js/aero/admin'));
});

/**
 *  Build process
 */
gulp.task('default', function(){
    // Min css
    gulp.watch("./assets/css/*.css", function(event){
        gulp.run('minify-css');
    });
    // User ugly and concat
    gulp.watch("./assets/js/aero/user/*.js", function(event){
        gulp.run('gulp minify-user-js');
        gulp.run('gulp concat-user-js');
    });
    // User ugly and concat
    gulp.watch("./assets/js/aero/admin/*.js", function(event){
        gulp.run('gulp minify-admin-js');
        gulp.run('gulp concat-admin-js');
    });
    // Api ugly
    gulp.watch("./assets/js/api/*.js", function(event){
        gulp.run('gulp minify-api-js');
    });
});

// Development watcher
gulp.task('watch', function () {
    gulp.watch(cssFiles, ['minify-css']);
    gulp.watch(jsAdminFiles, ['minify-admin-js', 'concat-admin-js']);
    gulp.watch(jsUserFiles, ['minify-user-js', 'concat-user-js']);
    gulp.watch(jsApiFiles, ['minify-api-js']);
});

// Production build
gulp.task('build', function () {
    gulp.run('minify-css');
    gulp.run('minify-user-js');
    gulp.run('minify-admin-js');
    gulp.run('minify-api-js');
    gulp.run('concat-user-js');
    gulp.run('concat-admin-js');
});