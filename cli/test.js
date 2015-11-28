import camelCase from 'camelcase';
import { startRouteTests } from '../test/routes';
import { getNestModules } from '../src/nest';

const root = process.cwd();

export default function testCommand(routeName) {
  let { routes } = getNestModules(root);

  // only run a single test
  if (routeName) {
    routeName = camelCase(routeName);
    routes = [routes[routeName]];
  }

  // Load the route tests
  startRouteTests(routes);
}
