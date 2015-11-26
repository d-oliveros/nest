import invariant from 'invariant';
import { isObject, extend } from 'lodash';
import inspect from 'util-inspect';
import logger from '../logger';

const debug = logger.debug('Operation:statics');

/**
 * Creates or find an operation to this route with the provided query argument.
 */
export const findOrCreate = async function(query, route) {
  invariant(isObject(route), 'Route is not an object');
  invariant(route.name, 'Route name is required.');
  invariant(route.provider, 'Provider is required.');

  const key = {
    routeId: `${route.provider}:${route.name}`,
    query: query || ''
  };

  debug(`findOrCreate with params\n${inspect(key)}`);

  let operation = await this.findOne(key).exec();

  if (!operation) {
    const params = extend({}, key, {
      provider: route.provider,
      route: route.name,
      priority: route.priority
    });

    debug(`Creating operation with params:\n${inspect(params)}`);

    operation = await this.create(params);
    operation.wasNew = true;
  } else {
    operation.wasNew = false;
  }

  return operation;
};

export const getNext = async function(params) {
  invariant(isObject(params), 'Invalid params');

  const { operationIds, disabledRoutes } = params;

  const query = {
    'state.finished': false
  };

  if (operationIds) {
    query._id = { $nin: operationIds };
  }

  if (disabledRoutes && disabledRoutes.length) {
    query.routeId = { $nin: disabledRoutes };
  }

  debug(`Getting next operation.\n` +
    `Query: ${inspect(query)}\n` +
    `Params: ${inspect(params)}`);

  return await this.findOne(query).sort({ 'priority': -1 }).exec();
};
