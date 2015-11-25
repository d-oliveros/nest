import invariant from 'invariant';
import { each, pick, isObject, extend } from 'lodash';
import logger from '../logger';

const debug = logger.debug('Operation:statics');

export const findOrCreate = async function(query) {
  invariant(isObject(query), 'Invalid params');
  invariant(query.route, 'Route is required.');
  invariant(query.provider, 'Provider is required.');

  const params = extend({}, query, {
    routeId: `${query.provider}:${query.route}`
  });

  const key = pick(params, 'route', 'provider', 'routeId', 'query');

  debug('findOrCreate with params', key);

  let operation = await this.findOne(key).exec();

  if (!operation) {
    debug('Creating operation with params', params);
    operation = await this.create(params);
    operation.wasNew = true;
  } else {
    operation.wasNew = false;
  }

  return operation;
};

export const getNext = async function(state) {
  const runningOperations = state.operationIds;
  const disabledRoutes = [];
  const runningRoutes = {};

  const query = {
    'state.finished': false
  };

  // disables routes if the concurrency treshold is met
  each(state.workers, (worker) => {
    if (!worker.route) return;

    const { provider, name, concurrency } = worker.route;
    const routeId = `${provider}:${name}`;

    runningRoutes[routeId] = runningRoutes[routeId] || 0;
    runningRoutes[routeId]++;

    if (runningRoutes[routeId] === concurrency) {
      disabledRoutes.push(routeId);
    }
  });

  if (runningOperations.length) {
    query._id = { $nin: runningOperations };
  }

  if (disabledRoutes.length) {
    query.routeId = { $nin: disabledRoutes };
  }

  return await this.findOne(query).sort({ 'priority': -1 }).exec();
};
