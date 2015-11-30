
/**
 * Loads the environment in `.env`.
 * If .env does not exists, `.env.default` will be used instead.
 */
var fs = require('fs');
var path = require('path');
var dotenv = require('dotenv');
var cwd = process.cwd();
var envPath = path.join(cwd, '.env');

if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}

if (!fs.existsSync(envPath)) {
  envPath += '.default';
}

if (!fs.existsSync(envPath)) {
  throw new Error('Environment config not found');
}

process.on('SIGINT', () => {
  process.exit();
});

dotenv.load({ path: envPath });
