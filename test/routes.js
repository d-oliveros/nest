/* eslint-disable no-console */
import './testenv';
import Mocha, { Test, Suite } from 'mocha';
import { each, isFunction, chain } from 'lodash';
import createSpider from '../src/spider';
import Operation from '../src/Operation';
import Item from '../src/Item';

/**
 * Creates a test descriptor that will test each provided route
 * @param  {Array} routes Routes to test
 * @return {undefined}
 */
export function startRouteTests(routes, plugins = {}) {
  const mocha = new Mocha();

  routes = chain(routes)
    .toArray()
    .filter((route) => {
      if (!route.test) {
        const { provider, name } = route;
        console.warn(`Hint: Enable test for ${provider}:${name} ;)`);
        return false;
      }

      return true;
    })
    .groupBy('provider')
    .value();

  const suite = Suite.create(mocha.suite, 'Routes');

  console.log(suite.__proto__);

  /*
  suite.timeout(20000); // 20 secs

  suite.beforeEach(async () => {
    await Operation.remove();
    await Item.remove();
  });

    // Test each route in each domain
    each(routes, (arr, domain) => {
      describe(domain, function() {
        each(arr, (route) => {
          if (!isFunction(route.scraper)) {
            console.warn(`Route without scraper: ${route.name}`);
            return;
          }

          createRouteTest({ domain, route, mocha, routes, plugins });
        });
      });
    });
  });
  */
}

function createRouteTest({ domain, route, mocha, routes, plugins }) {
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
      const spider = createSpider();

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
