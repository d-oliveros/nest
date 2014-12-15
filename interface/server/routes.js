var Router = require('express').Router;
var controllers = require('./controllers');

var router = new Router();

router.get('/', controllers.serveClient);
router.post('/api/scripts/:scriptName', controllers.runScript);

module.exports = router;
