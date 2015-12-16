/* eslint-disable no-var */

/**
 * Loads the environment in `.env`.
 * If .env does not exists, `.env.default` will be used instead.
 */
var fs = require('fs');
var path = require('path');
var dotenv = require('dotenv');
var cwd = process.cwd();
var defaultEnvPath = path.join(__dirname, '.env.default');
var envPath = path.join(cwd, '.env');

dotenv.load({ path: defaultEnvPath });

if (fs.existsSync(envPath)) {
  dotenv.load({ path: envPath });
}

process.on('SIGINT', () => {
  process.exit();
});
