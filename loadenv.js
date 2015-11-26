
/**
 * Loads the environment in `.env`.
 * If .env does not exists, `.env.default` will be used instead.
 */
var fs = require('fs');
var path = require('path');
var dotenv = require('dotenv');
var envPath = path.resolve('.env');

if (!fs.existsSync(envPath)) {
  envPath += '.default';
}

process.on('SIGINT', () => {
  process.exit();
});

dotenv.load({ path: envPath });
