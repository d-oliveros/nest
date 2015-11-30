/* eslint-disable no-console */
import './testenv';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { toArray } from 'lodash';
import { prettyPrint } from 'html';
import Mocha, { Test, Suite } from 'mocha';
import createSpider from '../src/spider';
import { populateRoutes } from '../src/route';
import Operation from '../src/db/Operation';
import logger from '../src/logger';
import Item from '../src/db/Item';

/**
 * Creates a test descriptor that will test each provided route
 * @param  {Array} routes Routes to test
 * @return {undefined}
 */
export function startRouteTests({ routes, plugins = {}}, root) {
  const mocha = new Mocha();

  const routesArr = toArray(populateRoutes(routes)).filter((route) => {
    if (!route.test) {
      console.warn(`Hint: Enable test for ${route.key} ;)`);
      return false;
    }

    return true;
  });

  const suite = Suite.create(mocha.suite, 'Routes');

  suite.timeout(20000); // 20 secs

  suite.beforeEach(async () => {
    await Operation.remove();
    await Item.remove();
  });

  // Test each route in each domain
  routesArr.forEach((route) => {
    const routeTest = createRouteTest(route, { routes, plugins }, root);
    suite.addTest(routeTest);
  });

  return new Promise((resolve, reject) => {
    if (routesArr.length === 1) {
      console.log(`Testing "${routesArr[0].key}" route...`);
    } else {
      console.log(`Testing ${routesArr.length} routes...`);
    }

    mocha.run((failureCount) => {
      if (failureCount) {
        const err = new Error('Tests failed');
        err.failureCount = failureCount;
        return reject(err);
      }

      resolve(routesArr.length);
    });
  });
}

function createRouteTest(route, { routes, plugins }, root) {
  const testParams = route.test;
  const { shouldSpawnOperations, shouldCreateItems } = testParams;
  const responsabilities = getTestResponsabilities(testParams);

  const testName = `${route.name} should ${responsabilities.join(' and ')}`;

  return new Test(testName, function(done) {
    const spider = createSpider();

    spider.on('page:open', logPageBody(route, root));

    spider.once('scraped:page', ({ created, operationsCreated }) => {
      spider.stop(true);

      if (shouldSpawnOperations && !operationsCreated) {
        const errorMsg = 'New crawling operations were not spawned.';
        return done(new Error(errorMsg));
      }

      if (shouldCreateItems && !created) {
        const errorMsg = 'No results scraped from page.';
        return done(new Error(errorMsg));
      }

      spider.once('operation:stopped', () => done());
    });

    // Skip this test if the request gets blocked
    let blockedRetries = 2;
    spider.on('operation:blocked', (operation) => {
      if (blockedRetries === 0) {
        spider.stop(true);
        console.log(`${operation.routeId} was blocked. Skipping test...`);
        done();
      } else {
        console.log(`${operation.routeId} was blocked. ` +
          `Retrying ${blockedRetries} more times...`);
        blockedRetries--;
      }
    });

    Operation.findOrCreate(testParams.query, route)
      .then((operation) => {
        return spider.scrape(operation, { routes, plugins });
      })
      .catch(done);
  });
}

function getTestResponsabilities(params) {
  const responsabilities = [];

  if (params.shouldSpawnOperations) {
    responsabilities.push('spawn operations');
  }

  if (params.shouldCreateItems) {
    responsabilities.push('scrape results');
  }

  return responsabilities;
}

function logPageBody(route, root) {
  return ({ data, isJSON }) => {
    const ext = isJSON ? 'json' : 'html';
    const dumppath = path.join(root, 'test-data');
    const filename = `${route.key}.${ext}`;
    const abspath = path.join(dumppath, filename);

    mkdirp(dumppath, (err) => {
      if (err) return logger.warn(err.stack);

      const prettyData = prettyPrint(data, { indent_size: 2 });

      fs.writeFile(abspath, prettyData, (err) => {
        if (err) {
          logger.warn(err.stack);
        }
      });
    });
  };
}
