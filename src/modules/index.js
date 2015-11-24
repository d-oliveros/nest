import fs from 'fs';

const files = fs.readdirSync(__dirname);

// export all the modules in the directories
files.forEach((filename) => {
  if (filename.indexOf('.js') < 0) {
    exports[filename] = require(`./${filename}`);
  }
});
