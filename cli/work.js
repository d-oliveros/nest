import debug from 'debug';
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const createNest = require('../src/nest').default;
const rootdir = process.cwd();

export default function workCommand() {
  createNest(rootdir).syndicate.start();
}
