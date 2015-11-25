var env = process.env;

module.exports = {
  db: env.MONGO_DB,
  host: env.MONGO_HOST,
  user: env.MONGO_USER,
  pass: env.MONGO_PASS
};
