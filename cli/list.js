import padStart from 'string.prototype.padstart';
import { each } from 'lodash';
import { getNestModules } from '../src/nest';

const rootdir = process.cwd();

export default function listCommand() {
  const { routes } = getNestModules(rootdir);

  if (!routes.length) {
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
  let string = '\n';

  // Pretty print the routes
  each(routes, (route) => {

    string += paddedPrint(13, 'key: ', route.key);

    if (route.name) {
      string += paddedPrint(13, 'name: ', route.name);
    }

    if (route.description) {
      string += paddedPrint(13, 'description: ', route.description);
    }

    string += paddedPrint(13, 'testable: ', route.test ? 'Yes' : 'No');
  });

  return string;
}

function paddedPrint(pad, string, suffix) {
  return padStart(string, pad) + suffix + '\n';
}
