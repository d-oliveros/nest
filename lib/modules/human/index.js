
// Module: Adds a `nameIsHuman` property to items with type set to "user"
//
// To enable: 
// Create or copy a file named "names.[js|json]" to this folder.
// names.[js|json] should be a JSON array or module exporting an array of names.
//
var check = require('./check');

module.exports = function(scraped, next) {
	var item, nameIsHuman;

	if (scraped.items.length) {
		for (var i = 0, len = scraped.items.length; i < len; i++) {
			item = scraped.items[i];

			// if this item is a user and has a name,
			// check if the name is a human name, and add the result on the item
			if ( item.type === 'user' && typeof item.name === 'string' ) {

				nameIsHuman = check(item.name);
				if ( typeof nameIsHuman === 'boolean' ) {
					item.nameIsHuman = nameIsHuman;
				}
			}
		}
	}

	next(null, scraped);
};
