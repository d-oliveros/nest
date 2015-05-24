import {each, noop} from 'lodash';
import _log from '../../logger';

let debug = _log.debug('Operation:statics');

export default { getKeyParams, findOrCreate, getNext };

function getKeyParams(params) {
  if (!params.route)
    throw new Error('Route is required.');

  if (!params.provider)
    throw new Error('Provider is required.');

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

function findOrCreate(params, callback=noop) {
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

function getNext(state, callback) {
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
