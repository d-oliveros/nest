import {noop} from 'lodash';

let phantomConfig = {};

phantomConfig.parameters = {
  'load-images': 'no',
  'ignore-ssl-errors': 'yes'
};

// Enables console.log's on PhantomJS scraping functions
if (process.env.PHANTOM_LOG !== 'true') {
  phantomConfig.onStdout = noop;
  phantomConfig.onStderr = noop;
}

export default phantomConfig;
