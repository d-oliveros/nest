/* eslint-disable no-console, import/imports-first */
import './testenv';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import Mocha, { Test, Suite } from 'mocha';
import { createSpider } from '../src/spider';
import { initializeRoutes } from '../src/route';
import logger from '../src/logger';
import Queue from '../src/db/queue';
import Item from '../src/db/item';

/**
 * Creates a test descriptor that will test each provided route
 * @param  {Array} routes Routes to test
 * @return {undefined}
 */
export default function startRouteTests({ routes, plugins = {}, dataDir, onlyRouteId }) {
  const mocha = new Mocha();

  const routesArr = initializeRoutes(routes).filter((route) => {
    if (!route.test) {
      console.warn(`Hint: Enable test for ${route.key} ;)`);
      return false;
    }

    return !onlyRouteId || onlyRouteId === route.key;
  });

  const suite = Suite.create(mocha.suite, 'Routes');

  suite.timeout(20000); // 20 secs

  suite.beforeEach(async () => {
    await Queue.remove();
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
  const { shouldSpawnJobs, shouldCreateItems } = testParams;
  const responsabilities = getTestResponsabilities(testParams);
  const testName = `${route.name} should ${responsabilities.join(' and ')}`;

  return new Test(testName, async () => {
    const spider = createSpider();

    const job = await Queue.createJob(route.key, { query: testParams.query });
    const url = route.getUrl(job);
    const scraped = await spider.scrape(url, route);

    if (dataDir) {
      await logScrapedData(scraped, route, dataDir);
      await logPageBody(scraped, route, dataDir);
    }

    if (shouldSpawnJobs && !scraped.jobs.length) {
      const errorMsg = 'New crawling jobs were not spawned.';
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

  if (params.shouldSpawnJobs) {
    responsabilities.push('spawn jobs');
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
