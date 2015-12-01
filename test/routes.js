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
import Action from '../src/db/Action';
import logger from '../src/logger';
import Item from '../src/db/Item';

/**
 * Creates a test descriptor that will test each provided route
 * @param  {Array} routes Routes to test
 * @return {undefined}
 */
export function startRouteTests({ routes, plugins = {}, dataDir, onlyRouteId }) {
  const mocha = new Mocha();

  const routesArr = populateRoutes(routes).filter((route) => {
    if (!route.test) {
      console.warn(`Hint: Enable test for ${route.key} ;)`);
      return false;
    }

    return !onlyRouteId || onlyRouteId === route.key;
  });

  const suite = Suite.create(mocha.suite, 'Routes');

  suite.timeout(20000); // 20 secs

  suite.beforeEach(async () => {
    await Action.remove();
    await Item.remove();
  });

  // Test each route in each domain
  routesArr.forEach((route) => {
    const routeTest = createRouteTest(route, { routes, plugins }, dataDir);
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

function createRouteTest(route, { routes, plugins }, dataDir) {
  const testParams = route.test;
  const { shouldSpawnActions, shouldCreateItems } = testParams;
  const responsabilities = getTestResponsabilities(testParams);

  const testName = `${route.name} should ${responsabilities.join(' and ')}`;

  return new Test(testName, function(done) {
    const spider = createSpider();

    if (dataDir) {
      spider.on('page:open', logPageBody(route, dataDir));
    }

    spider.once('scraped:page', ({ created, actionsCreated }) => {
      spider.stop(true);

      if (shouldSpawnActions && !actionsCreated) {
        const errorMsg = 'New crawling actions were not spawned.';
        return done(new Error(errorMsg));
      }

      if (shouldCreateItems && !created) {
        const errorMsg = 'No results scraped from page.';
        return done(new Error(errorMsg));
      }

      spider.once('action:stopped', () => done());
    });

    // Skip this test if the request gets blocked
    let blockedRetries = 2;
    spider.on('action:blocked', (action) => {
      if (blockedRetries === 0) {
        spider.stop(true);
        console.log(`${action.routeId} was blocked. Skipping test...`);
        done();
      } else {
        console.log(`${action.routeId} was blocked. ` +
          `Retrying ${blockedRetries} more times...`);
        blockedRetries--;
      }
    });

    Action.findOrCreate(testParams.query, route)
      .then((action) => {
        return spider.scrape(action, { routes, plugins });
      })
      .catch(done);
  });
}

function getTestResponsabilities(params) {
  const responsabilities = [];

  if (params.shouldSpawnActions) {
    responsabilities.push('spawn actions');
  }

  if (params.shouldCreateItems) {
    responsabilities.push('scrape results');
  }

  return responsabilities;
}

function logPageBody(route, dataDir) {
  return ({ data, isJSON }) => {
    const ext = isJSON ? 'json' : 'html';
    const dumppath = path.join(dataDir, 'test-data');
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
