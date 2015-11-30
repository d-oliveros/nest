import { isObject, find } from 'lodash';
import { startRouteTests } from '../test/routes';
import { getNestModules } from '../src/nest';

const root = process.cwd();

export default async function testCommand(routeKey) {
  try {
    let { routes } = getNestModules(root);

    // only run a single test
    if (routeKey) {
      const route = find(routes, { key: routeKey });

      if (!route) {
        console.log(`Route "${routeKey}" not found`);
        process.exit(4);
      }

      routes = [route];
    }

    // Load the route tests
    await startRouteTests({ routes }, root);

    process.exit(0);

  } catch (err) {
    if (isObject(err) && !err.failureCount) {
      console.error(err.stack);
    }
    process.exit(8);
  }
}
