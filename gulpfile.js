require('./globals');

var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('lint', function() {
	return gulp.src(__config.lint)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('watch', function() {
	gulp.watch(__config.lint, ['lint']);
});

gulp.task('default', ['lint', 'watch']);
