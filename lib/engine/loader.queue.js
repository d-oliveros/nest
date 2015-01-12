var async = require('async');

// This will process the tasks in series 
// API docs: https://github.com/caolan/async#queue
module.exports = async.queue( function(task, callback) {
	task(callback);
}, 1);
