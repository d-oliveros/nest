require('./globals');

var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('lint', function() {
	'clearREPL'
	return gulp.src(__config.lint)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

var clearSeq = '\u001B[2J\u001B[0;0f';
gulp.task('clearREPL', process.stdout.write.bind(process.stdout, clearSeq));

gulp.task('watch', function() {
	gulp.watch(__config.lint, ['clearREPL', 'lint']);
});

gulp.task('default', ['clearREPL', 'lint', 'watch']);
