
module.exports = Agent;

function Agent() {
	this.phantom    = null;
	this.iterations = 0;
	this.emitters   = [];
	this.addEventHandlers();
}

Agent.prototype = require('./prototype');
