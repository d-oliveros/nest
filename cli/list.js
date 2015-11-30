import padStart from 'string.prototype.padstart';
import { getNestModules } from '../src/nest';

const rootdir = process.cwd();

export default function listCommand() {
  const { routes } = getNestModules(rootdir);

  if (routes.length === 0) {
    console.log('No routes available');
    process.exit(1);
  }

  console.log(`\n` +
    `--Available Routes--\n` +
    `* to scrape a route: nest scrape <route>\n` +
    prettyPrint(routes)
  );

  process.exit();
}

/**
 * returns the routes in a nicely formatted string
 * @param  {Object} routes Routes to use
 * @return {String}        Nicely formatted string
 */
function prettyPrint(routes) {
  const pad = 14;
  let string = '\n';

  // Pretty print the routes
  routes.forEach((route) => {
    string += paddedPrint(pad, 'key: ', route.key);

    if (route.name) {
      string += paddedPrint(pad, 'name: ', route.name);
    }

    if (route.description) {
      string += paddedPrint(pad, 'description: ', route.description);
    }

    string += paddedPrint(pad, 'testable: ', route.test ? 'Yes' : 'No');

    string += '\n';
  });

  return string;
}

function paddedPrint(pad, string, suffix) {
  return padStart(string, pad) + suffix + '\n';
}
