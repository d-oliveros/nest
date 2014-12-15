var redis = require('redis');

var port = __config.redis.port;
var host = __config.redis.host;
var options = __config.redis.options;

var client = redis.createClient(port, host, options);

client.on('error', console.error.bind(console));

module.exports = client;
