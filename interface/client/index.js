( function() {
	'use strict';

	var app = angular.module('nest', []);
	
	// Expose some methods
	//
	app.run( function($rootScope, $http) {
		$rootScope.runScript = function(scriptName) {
			$http.post('/api/scripts/'+scriptName);
		}
	});

	// Initialize the sockets
	//
	app.run( function($rootScope, $log) {
		var socket = io();

		socket.on('connect', function() {
			$log.info('WebSockets connected.');
		});

		socket.on('disconnect', function(){
			$log.info('WebSockets disconnected.');
		});

		socket.on('connect_failed', function(){
			$log.info('Connection failed to sockets server.');
		});
		
		socket.on('operation:start', function(operation) {
			var message = 'Operation: Scraping Page ' + operation.state.currentPage;
			message += ' of query '+operation.query;
			message += ' on ' + operation.route;
			$log.info(message);
		});

		socket.on('results', function(route, data) {
			console.log(data);
			if (data.updated || data.created) {
				$log.info('Got', data.updated+data.created, 'results from', route);
				$log.debug(data.profiles);
			}
		});

		$rootScope.socket = socket;
	});
}())