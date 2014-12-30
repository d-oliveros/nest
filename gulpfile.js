require('./globals');

var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('lint', function() {
	var dirs = [
		'index.js',
		'logger.js',
		'scripts/**/*',
		'routes/**/*.js',
		'framework/**/*.js',
		'config/**/*.js',
		'test/**/*.js',
	];

	return gulp.src(dirs)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clearREPL', function() {
	process.stdout.write('\u001B[2J\u001B[0;0f');
});

gulp.task('watch', function() {
	gulp.watch(__config.lint, ['clearREPL', 'lint']);
});

gulp.task('default', ['clearREPL', 'lint', 'watch']);
