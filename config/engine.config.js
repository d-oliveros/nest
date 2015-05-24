import os from 'os';

export default {
	workers: os.cpus().length,

	// These routes will not be processed by the engine.
	disabledRoutes: []
};
