import debug from 'debug';
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const createNest = require('../src/nest').createNest;
const rootdir = process.cwd();

export default function workCommand() {
  createNest(rootdir).engine.start();
}
