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
			$log.info( 
				'Operation: '+
				'Scraping Page '+ operation.state.currentPage+
				' of query '+operation.query+
				' on ' + operation.route
			);
		});

		socket.on('results', function(route, data) {

			console.log(data);

			if (data.updated || data.created) {
				$log.debug(data.profiles);
				$log.info('Got',data.updated+data.created,'results from',route);
			}
		});

		$rootScope.socket = socket;
	});
}())