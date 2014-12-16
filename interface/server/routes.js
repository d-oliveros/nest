var Router = require('express').Router;
var controllers = require('./controllers');

var router = new Router();

router.get('/', controllers.serveClient);

module.exports = router;
