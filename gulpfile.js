var gulp = require('gulp');
var eslint = require('gulp-eslint');

var files = [
  'index.js',
  'bin/**/*',
  'routes/**/*.js',
  'lib/**/*.js',
  'config/**/*.js',
  'test/**/*.js',
];

gulp.task('lint', function() {
  return gulp.src(files)
    .pipe(eslint())
    .pipe(eslint.formatEach(null, console.log.bind(console)));
});

gulp.task('clearREPL', function() {
  process.stdout.write('\u001B[2J\u001B[0;0f');
});

gulp.task('watch', function() {
  gulp.watch(files, ['clearREPL', 'lint']);
});

gulp.task('default', ['clearREPL', 'lint', 'watch']);
