var _            = require('lodash');
var async        = require('async');
var phantom      = require('phantom');
var EventEmitter = require('events').EventEmitter;

var config       = require('../../config');
var _log         = require('../logger');
var debug        = _log.debug('Agent');

// Exports: Agent
//
module.exports = Agent;


function Agent() {
	this.phantom    = null;
	this.iterations = 0;
	this.emitters   = [];

	// Debug handlers
	this.on('start',        debug.bind(this, 'Starting operation.'));
	this.on('finish',       debug.bind(this, 'Operation finished.'));
	this.on('scraped:raw',  debug.bind(this, 'Got raw scraped data.'));
	this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
}

Agent.prototype = _.clone(EventEmitter.prototype);

// Override: EventEmitter.emit
Agent.prototype.emit = function() {
	var args = _.toArray(arguments);

	// emit the event through own emitter
	EventEmitter.prototype.emit.apply(this, args);

	// emit the event through all the attached emitters
	_.each(this.emitters, function(emitter) {

		// go through this emitter's emitters, if any.
		if ( emitter.emitters ) {
			Agent.prototype.emit.apply(emitter, args);
		} 

		// or, emit the event through this emitter
		else {
			EventEmitter.prototype.emit.apply(emitter, args);
		}
	});
};

// runs an operation
Agent.prototype.run = require('./run.method');

// creates a phantomJS instance
Agent.prototype.createPhantom = function(callback) {
	var self = this;

	debug('Creating PhantomJS instance');
	phantom.create(config.phantom, function(ph) {
		self.phantom = ph;
		callback(null, ph);
	});
};

// stops its phantomJS instance
Agent.prototype.stopPhantom = function() {
	debug('Stopping PhantomJS');

	if ( this.phantom ) {
		this.phantom.exit();
	}

	this.phantom = null;
};

// opens a URL in Phantom, returns the loaded page
Agent.prototype.open = function(url, callback) {
	var self = this;
	self.url = url;

	debug('Opening URL '+url);

	async.waterfall([
		function getPhantom(cb) {
			if ( self.phantom ) return cb(null, self.phantom);
			self.createPhantom(cb);
		},
		function createPage(phantom, cb) {
			phantom.createPage( function(page) {
				cb(null, page);
			});
		},
		function enableConsole(page, cb) {
			if ( process.env.PHANTOM_LOG === 'true' ) {
				page.set('onConsoleMessage', function (msg) {
					console.log("Phantom Console: " + msg);
				});
			}
			cb(null, page);
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

// includes javascript <script> tags in opened web page
Agent.prototype.includeJS = function(page, callback) {
	debug('Including JS on page');
	page.includeJs('https://code.jquery.com/jquery-2.1.1.min.js', callback);
};

// stops the agent, optionally clearing the listeners
Agent.prototype.stop = function(removeListeners) {
	debug('Stopping Agent.');

	if ( removeListeners ) {
		this.removeAllListeners();
	}

	this.stopPhantom();
	this.emit('agent:stop');
};

// adds an external EventEmitter
Agent.prototype.addEmitter = function(emitter) {
	this.emitters.push(emitter);
};

// removes an EventEmitter
Agent.prototype.removeEmitter = function(emitter) {
	_.pull(this.emitters, emitter);
};

// sanitize the raw scraped data
Agent.prototype.sanitizeScraped = function(scraped) {
	var sanitized = _.clone(scraped ? scraped : {});

	debug('Sanitizing scraped');

	// trim text properties
	_.each(sanitized, function(value, key) {
		if ( typeof value === 'string' ) {
			sanitized[key] = sanitized[key].trim();
		}
	});

	// remove empty properties
	sanitized = _.pick(sanitized, _.identity);

	// set up defaults
	_.defaults(sanitized, {
		hasNextPage: false,
		items: [],
		operations: [],
	});

	return sanitized;
};

// error handler
Agent.prototype.error = function(error) {
	if ( typeof error === 'string' ) {
		error = 'Agent: '+error;
		error += ' (Iteration: '+this.iteration+')';
		error += this.url ? ' (URL: '+this.url+')' : '';
		error = new Error(error);
	}

	this.stopPhantom();
	this.emit('error', error);
};
