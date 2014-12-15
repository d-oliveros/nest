var scripts = require(__interface+'/server/scripts');

module.exports = function(req, res) {
	try {
		scripts[req.params.scriptName]();
	} catch(err) {
		return res.json(500, err);
	}
	
	res.send('ok');
};
