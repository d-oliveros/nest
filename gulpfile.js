var gulp = require('gulp');
var jshint = require('gulp-jshint');

var files = [
	'index.js',
	'logger.js',
	'scripts/**/*',
	'routes/**/*.js',
	'framework/**/*.js',
	'config/**/*.js',
	'test/**/*.js',
];

gulp.task('lint', function() {

	return gulp.src(files)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clearREPL', function() {
	process.stdout.write('\u001B[2J\u001B[0;0f');
});

gulp.task('watch', function() {
	gulp.watch(files, ['clearREPL', 'lint']);
});

gulp.task('default', ['clearREPL', 'lint', 'watch']);
