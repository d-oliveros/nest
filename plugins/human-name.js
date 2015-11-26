/**
 * Adds a `nameIsHuman` property to items with type set to "user".
 *
 * To enable:
 *  Create or copy a file named "names.json" to this folder.
 *  names.json should be a JSON array of names. These names will be
 *  used to check if an item has a human name.
 */
import invariant from 'invariant';
import fs from 'fs';

let names;

// load the human names list
if (fs.existsSync('./names.json')) {
  names = require('./names');
  invariant(names instanceof Array, 'names.json is not a valid array.');
} else {
  names = [];
}

// checks if a string is a human name
function checkIfHumanName(string) {
  if (names.length === 0) return null;

  const words = string.split(' ');
  let isHuman = false;

  for (let i = 0, len = words.length; i < len; i++) {
    if (names.indexOf(words[i].toLowerCase().trim()) > -1) {
      isHuman = true;
      break;
    }
  }

  return isHuman;
}

export default async function humanNameSetterModule(scraped) {
  if (scraped.items.length) {
    for (let i = 0, len = scraped.items.length; i < len; i++) {
      const item = scraped.items[i];

      // if this item is a user and has a name,
      // check if the name is a human name, and add the result on the item
      if (item.type === 'user' && typeof item.name === 'string') {

        const nameIsHuman = checkIfHumanName(item.name);
        if (typeof nameIsHuman === 'boolean') {
          item.nameIsHuman = nameIsHuman;
        }
      }
    }
  }
}
