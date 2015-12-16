/* eslint-disable vars-on-top */
/* eslint-disable no-var */
var env = process.env;
var isTest = env.NODE_ENV === 'test';
var config = {};

// Stand-alone config
if (!env.MONGO_REPLICA_SET) {
  config = {
    db: isTest ? 'nest_test' : env.MONGO_DB,
    host: env.MONGO_HOST,
    port: env.MONGO_PORT,
    user: env.MONGO_USER,
    pass: env.MONGO_PASS
  };
} else {

  // Replica set config
  config = {
    db: env.MONGO_DB,
    port: env.MONGO_PORT,
    replicaSet: {
      hosts: env.MONGO_REPLICA_HOSTS.split(',').map((host) => host.trim()),
      options: {
        replset: { replicaSet: env.MONGO_REPLICA_SET, connectTimeoutMS: 5000, keepAlive: 1 },
        server: { keepAlive: 1, connectTimeoutMS: 5000 },
        readPreference: 'PRIMARY',
        user: env.MONGO_USER,
        pass: env.MONGO_PASS
      }
    }
  };

  var replicaSet = config.replicaSet;
  var hosts = replicaSet.hosts;
  var port = config.port;
  var db = config.db;

  // URI is in the following format:
  // mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
  config.replicaSet.uri = hosts.map(function(host, key) {
    var prefix = key === 0 ? 'mongodb://' : '';
    var suffix = key === (hosts.length - 1) ? '/' + db : '';
    return prefix + host + ':' + port + suffix;
  }).join(',');
}

module.exports = config;
