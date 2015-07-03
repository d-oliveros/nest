import invariant from 'invariant';
import {each, noop} from 'lodash';
import logger from '../logger';

let debug = logger.debug('Operation:statics');

export function getKeyParams(params) {
  invariant(params.route, 'Route is required.');
  invariant(params.provider, 'Provider is required.');

  let route = params.route;
  let provider = params.provider;

  let keyParams = {
    route: route,
    provider: provider,
    routeId: `${provider}:${route}`
  };

  if (params.query)
    keyParams.query = params.query;

  debug('Generated key params', keyParams);

  return keyParams;
}

export function findOrCreate(params, callback=noop) {
  let keyParams = this.getKeyParams(params);
  params.routeId = keyParams.routeId;

  debug('findOrCreate with params', keyParams);

  this.findOne(keyParams, (err, operation) => {
    if (err) return callback(err);
    if (!operation) {
      debug('Creating operation with params', params);
      this.create(params, (err, operation) => {
        if (err) return callback(err);
        operation.wasNew = true;
        callback(null, operation);
      });
    }
    else {
      operation.wasNew = false;
      callback(null, operation);
    }
  });
}

export function getNext(state, callback) {
  let runningOperations = state.operationIds;
  let disabledRoutes = [];
  let runningRoutes = {};

  let query = {
    'state.finished': false
  };

  // disables routes if the concurrency treshold is met
  each(state.workers, (worker) => {
    if (!worker.route)
      return;

    let {provider, name, concurrency} = worker.route;

    let routeId = `${provider}:${name}`;

    runningRoutes[routeId] = runningRoutes[routeId] || 0;
    runningRoutes[routeId]++;

    if (runningRoutes[routeId] === concurrency)
      disabledRoutes.push(routeId);

  });

  if (runningOperations.length)
    query._id = { $nin: runningOperations };

  if (disabledRoutes.length)
    query.routeId = { $nin: disabledRoutes };

  this
    .findOne(query)
    .sort({ 'priority': -1 })
    .exec(callback);
}
