import { each, toArray, groupBy } from 'lodash';
import { getNestModules } from '../src/nest';

const rootdir = process.cwd();

export default function listCommand() {
  const { routes } = getNestModules(rootdir);
  console.log(`\n--Available Routes--\n${prettyPrint(routes)}`);
  process.exit();
}

/**
 * returns the routes in a nicely formatted string
 * @param  {Object} routes Routes to use
 * @return {String}        Nicely formatted string
 */
function prettyPrint(routes) {
  let string = '\n';

  routes = groupBy(toArray(routes), 'provider');

  // Pretty print the routes
  each(routes, (domain, domainName) => {
    string += `${domainName}\n`;

    // for each route
    each(domain, (toPrint) => {

      string += `  ${domainName}:${toPrint.name}`;

      // warn on tests disabled
      if (!toPrint.test) {
        string += ' (not testable)';
      }

      string += '\n';
    });
    string += '\n';
  });

  return string;
}
