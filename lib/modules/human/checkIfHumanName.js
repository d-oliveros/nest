import fs from 'fs';

let names;

// load the human names list
if (fs.existsSync('./names.json')) {
  names = require('./names');
  if (!(names instanceof Array)) {
    throw new Error('names.json is not a valid array.');
  }
} else {
  names = [];
}

// Exports: func
// checks if a string is a human name
//
export default function checkIfHumanName(string) {
  if (names.length === 0) return null;

  let words = string.split(' ');
  let isHuman = false;

  for (let i = 0, len = words.length; i < len; i++) {
    if (names.indexOf(words[i].toLowerCase().trim()) > -1) {
      isHuman = true;
      break;
    }
  }

  return isHuman;
};
