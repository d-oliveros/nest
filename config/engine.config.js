var os = require('os');

exports.workers = os.cpus().length;

// This routes will not be processed by the engine.
exports.disabledRoutes = [];
