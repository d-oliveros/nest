const { env } = process;
const isTest = env.NODE_ENV === 'test';
let config = {};

if (!env.MONGO_REPLICA_SET) {
  config = { // Stand-alone config
    db: isTest ? 'nest_test' : env.MONGO_DB,
    host: env.MONGO_HOST,
    port: env.MONGO_PORT,
    user: env.MONGO_USER,
    pass: env.MONGO_PASS,
  };
}
else {
  config = { // Replica set config
    db: env.MONGO_DB,
    port: env.MONGO_PORT,
    replicaSet: {
      hosts: env.MONGO_REPLICA_HOSTS.split(',').map(host => host.trim()),
      options: {
        replset: { replicaSet: env.MONGO_REPLICA_SET, connectTimeoutMS: 5000, keepAlive: 1 },
        server: { keepAlive: 1, connectTimeoutMS: 5000 },
        readPreference: 'PRIMARY',
        user: env.MONGO_USER,
        pass: env.MONGO_PASS,
      },
    },
  };

  const { port, db, replicaSet: { hosts } } = config;

  // URI is in the following format:
  // mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
  config.replicaSet.uri = hosts.map((host, key) => {
    const prefix = key === 0 ? 'mongodb://' : '';
    const suffix = key === (hosts.length - 1) ? `/${db}` : '';
    return `${prefix}${host}:${port}${suffix}`;
  }).join(',');
}

module.exports = config;
