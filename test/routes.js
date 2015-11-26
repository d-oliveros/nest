/* eslint-disable no-console */
import './testenv';
import { each } from 'lodash';
import Route from '../src/Route';
import Item from '../src/Item';
import Spider from '../src/Spider';
import Operation from '../src/Operation';
import domains from '../routes';
import routes from '../routes';
import plugins from '../plugins';

const testRoute = process.env.TEST_ROUTE || false;
const testDomain = process.env.TEST_DOMAIN || false;

xdescribe('Routes', function() {
  this.timeout(20000); // 20 secs

  beforeEach(async () => {
    await Operation.remove();
    await Item.remove();
  });

  // Test each route in each domain
  each(domains, (domain, domainName) => {
    if (testDomain && testDomain !== domainName) {
      return;
    }

    describe(domainName, function() {

      each(domain, (route, routeName) => {
        const routeId = `${domainName}:${routeName}`;
        const shouldTest = !testRoute || testRoute === routeId;

        if (!(route instanceof Route) || !shouldTest) {
          return;
        }

        if (!route.test) {
          const { provider, name } = route;
          console.warn(`Hint: Enable test for ${provider}:${name} ;)`);
        } else {
          createRouteTest(domain, route);
        }
      });
    });
  });
});

function createRouteTest(domain, route) {
  const testParams = route.test;

  describe(route.name, function() {
    const responsabilities = [];

    before(async () => {
      await Item.remove();
    });

    if (testParams.shouldSpawnOperations) {
      responsabilities.push('spawn operations');
    }

    if (testParams.shouldCreateItems) {
      responsabilities.push('scrape results');
    }

    it(`should ${responsabilities.join(' and ')}`, (done) => {
      const spider = new Spider();

      Operation.findOrCreate(testParams.query, route)
        .then((operation) => {
          return spider.scrape(operation, { routes, plugins });
        })
        .catch(done);

      let togo = 0;

      function next() {
        togo--;
        if (togo === 0) {
          spider.stop(true);
          spider.on('operation:stopped', () => done());
        }
      }

      if (testParams.shouldSpawnOperations) {
        togo++;
        spider.once('operations:created', (operations) => {
          if (!operations.length) {
            console.error(operations);
            const errorMsg = 'New crawling operations were not spawned.';
            return done(new Error(errorMsg));
          }

          next();
        });
      }

      if (testParams.shouldCreateItems) {
        togo++;
        spider.once('scraped:page', (results, operation) => {
          if (results.created <= 0) {
            console.error(results, operation);

            const errorMsg = 'No results scraped from page.';
            return done(new Error(errorMsg));
          }

          next();
        });
      }

      // Skip this test if the request gets blocked
      let blockedRetries = 2;
      spider.on('operation:blocked', (operation) => {
        if (blockedRetries === 0) {
          spider.stop();
          console.log(`${operation.routeId} was blocked. Skipping test...`);
          done();
        } else {
          console.log(`${operation.routeId} was blocked. ` +
            `Retrying ${blockedRetries} more times...`);
          blockedRetries--;
        }
      });
    });
  });
}
