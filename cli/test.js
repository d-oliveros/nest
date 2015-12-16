import { isObject, find } from 'lodash';
import { startRouteTests } from '../test/routes';
import { getNestModules } from '../src/nest';

const root = process.cwd();

/**
 * Runs the automated route tests.
 * @param  {String}  routeKey  Route to test. (optional)
 */
export default async function testCommand(routeKey) {
  try {
    const { routes } = getNestModules(root);

    // only run a single test
    if (routeKey && !find(routes, { key: routeKey })) {
      console.log(`Route "${routeKey}" not found`);
      process.exit(4);
    }

    // Load the route tests
    await startRouteTests({
      routes: routes,
      onlyRouteId: routeKey,
      dataDir: root
    });

    process.exit(0);

  } catch (err) {
    if (isObject(err) && !err.failureCount) {
      console.error(err.stack);
    }
    process.exit(8);
  }
}
