/* eslint-disable no-console */
import './testenv';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import Mocha, { Test, Suite } from 'mocha';
import { createSpider } from '../src/spider';
import { populateRoutes } from '../src/route';
import logger from '../src/logger';
import Action from '../src/db/Action';
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

  return new Test(testName, async () => {
    const spider = createSpider();

    const action = await Action.findOrCreate(route, testParams.query);
    const url = route.getUrl(action);
    const scraped = await spider.scrape(url, route);

    if (dataDir) {
      await logScrapedData(scraped, route, dataDir);
      await logPageBody(scraped, route, dataDir);
    }

    if (shouldSpawnActions && !scraped.actions.length) {
      const errorMsg = 'New crawling actions were not spawned.';
      throw new Error(errorMsg);
    }

    if (shouldCreateItems && !scraped.items.length) {
      const errorMsg = 'No items scraped from page.';
      throw new Error(errorMsg);
    }
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

function logScrapedData(scraped, route, dataDir) {
  const dumppath = path.join(dataDir, 'test-data');
  const filename = `scraped-${route.key}.json`;
  const abspath = path.join(dumppath, filename);

  return new Promise((resolve) => {
    mkdirp(dumppath, (err) => {
      if (err) return logger.warn(err.stack);

      fs.writeFile(abspath, JSON.stringify(scraped, null, 2), (err) => {
        if (err) {
          logger.warn(err.stack);
        }

        resolve();
      });
    });
  });
}

function logPageBody({ page }, route, dataDir) {
  const { data, isJSON } = page;
  const ext = isJSON ? 'json' : 'html';
  const dumppath = path.join(dataDir, 'test-data');
  const filename = `${route.key}.${ext}`;
  const abspath = path.join(dumppath, filename);

  return new Promise((resolve) => {
    mkdirp(dumppath, (err) => {
      if (err) {
        logger.warn(err.stack);
        return resolve();
      }

      fs.writeFile(abspath, data, (err) => {
        if (err) {
          logger.warn(err.stack);
        }
        resolve();
      });
    });
  });
}
