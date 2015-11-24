
// Module: Adds a `nameIsHuman` property to items with type set to "user"
//
// To enable:
// Create or copy a file named "names.[js|json]" to this folder.
// names.[js|json] should be a JSON array or module exporting an array of names.
//
import checkIfHumanName from './checkIfHumanName';

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
