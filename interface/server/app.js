var express = require('express');
var router = require('./routes');

var app = express();

app.set('views', __dirname+'/views');
app.set('view engine', 'jade');

app.use('/', express.static(__interface+'/client'));
app.use(router);

module.exports = app;
