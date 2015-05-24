require('./test-env');

import {each} from 'lodash';
import Route from '../lib/route';
import Item from '../lib/models/Item';
import Operation from '../lib/models/Operation';

let testRoute  = process.env.TEST_ROUTE || false;
let testDomain = process.env.TEST_DOMAIN || false;

describe('Routes', function() {
  this.timeout(20000); // 20 secs

  beforeEach((done) => {
    Operation.remove((err) => {
      if (err) return done(err);
      Item.remove(done);
    });
  });

  let domains = require('../routes');

  each(domains, (domain, domainName) => {
    if (testDomain && testDomain !== domainName)
      return;

    describe(domainName, function() {

      each(domain, (route, routeName) => {
        let routeId = `${domainName}:${routeName}`;
        let shouldTest = !testRoute || testRoute === routeId;

        if (!(route instanceof Route) || !shouldTest)
          return;

        if (!route.test) {
          let {provider, name} = route;
          console.warn(`Hint: Enable test for ${provider}:${name} ;)`);
        }

        else
          createRouteTest(domain, route);
      });
    });
  });
});

function createRouteTest(domain, route) {
  let testParams = route.test;

  describe(route.name, function() {

    before((done) => Item.remove(done));

    let responsabilities = [];

    if (testParams.shouldSpawnOperations)
      responsabilities.push('spawn operations');

    if (testParams.shouldCreateItems)
      responsabilities.push('scrape results');

    it(`should ${responsabilities.join(' and ')}`, (done) => {
      let spider = route.start(testParams.query);
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
            let errorMsg = 'New crawling operations were not spawned.';
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

            let errorMsg = 'No results scraped from page.';
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
          console.log(`${operation.routeId} was blocked. `+
            `Retrying ${blockedRetries} more times...`);
          blockedRetries--;
        }
      });
    });
  });
}
