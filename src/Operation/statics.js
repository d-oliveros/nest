import invariant from 'invariant';
import { pick, isString, isObject, extend } from 'lodash';
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

export const getNext = async function(params) {
  const query = {
    'state.finished': false
  };

  if (params.operationIds) {
    query._id = { $nin: params.operationIds };
  }

  if (params.disabledRoutes.length) {
    query.routeId = { $nin: params.disabledRoutes };
  }

  return await this.findOne(query).sort({ 'priority': -1 }).exec();
};

/**
 * Creates an operation to this route with the provided query argument
 * @param  {String}  query  The query to use with this route
 * @param  {Object}  route  The route to use
 * @return {Object}         The operation stats
 */
export const initialize = async function(query, route) {
  invariant(isString(query), 'Query is not a string');
  invariant(isObject(route), 'Route is not an object');

  const { provider, name, priority } = route;
  return await this.findOrCreate({ provider, name, priority, query });
};
