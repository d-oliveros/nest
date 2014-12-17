var _            = require('lodash');
var async        = require('async');
var phantom      = require('phantom');
var EventEmitter = require('events').EventEmitter;

var debug        = require('debug')('Agent');

module.exports = _.clone(EventEmitter.prototype);

exports = module.exports;

// Override: EventEmitter.emit
//
exports.emit = function() {
	var args = _.toArray(arguments);

	// Emit the event through own emitter
	EventEmitter.prototype.emit.apply(this, args);

	// Emit the event through all the attached emitters
	_.each(this.emitters, function(emitter) {

		// Go through this emitter's emitters, if any.
		if ( emitter.emitters ) {
			exports.emit.apply(emitter, args);
		} 

		// Or, emit the event through this emitter
		else {
			EventEmitter.prototype.emit.apply(emitter, args);
		}
	});
};

// Creates a phantomJS instance
exports.createPhantom = function(callback) {
	var self = this;

	debug('Creating PhantomJS instance');
	phantom.create(__config.phantom, function(ph) {
		self.phantom = ph;
		callback(null, ph);
	});
};

exports.stopPhantom = function() {
	debug('Stopping PhantomJS');

	if ( this.phantom ) {
		this.phantom.exit();
	}

	this.phantom = null;
};

exports.open = function(url, callback) {
	var self = this;
	self.url = url;

	debug('Opening URL '+url);

	async.waterfall([
		function getPhantom(cb) {
			if ( self.phantom ) return cb(null, phantom);
			self.createPhantom(cb);
		},
		function createPage(phantom, cb) {
			phantom.createPage( function(page) {
				cb(null, page);
			});
		},
		function openURL(page, cb) {
			page.open(url, function(status) {
				if (!status) return cb('Could not open url: '+url);
				cb(null, page);
			});
		},
		function includeJS(page, cb) {
			self.includeJS(page, function(status) {
				if (!status) return cb('Could not include JS on url: '+url);
				self.emit('page:ready', page);
				cb(null, page);
			});
		},
	], callback);
};

exports.stop = function(removeListeners) {
	debug('Stopping Agent.');

	if ( removeListeners ) {
		this.removeAllListeners();
	}

	this.stopPhantom();
	this.emit('agent:stop');
};

exports.addEmitter = function(emitter) {
	this.emitters.push(emitter);
};

exports.removeEmitter = function(emitter) {
	_.pull(this.emitters, emitter);
};

exports.includeJS = function(page, callback) {
	debug('Including JS on page');
	page.includeJs('https://code.jquery.com/jquery-2.1.1.min.js', callback);
};

exports.sanitizeScraped = function(scraped) {
	var sanitized = _.clone(scraped ? scraped : {});

	debug('Sanitizing scraped');

	_.defaults(sanitized, {
		hasNextPage: false,
		items: [],
		operations: [],
	});

	// Remove empty properties
	_.each(sanitized.items, function(item) {
		item.local = _.pick(item.local, _.identity);
	});

	return sanitized;
};

exports.error = function(error) {
	if ( typeof error === 'string' ) {
		error = 'Agent: '+error;
		error += ' (Iteration: '+this.iteration+')';
		error += this.url ? ' (URL: '+this.url+')' : '';
		error = new Error(error);
	}

	this.stopPhantom();
	this.emit('error', error);
};

exports.addEventHandlers = function() {

	// Debugger
	this.on('start',        debug.bind(this, 'Starting operation.'));
	this.on('finish',       debug.bind(this, 'Operation finished.'));
	this.on('scraped:raw',  debug.bind(this, 'Got raw scraped data.'));
	this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
	
};

exports.run = require('./run.method');
