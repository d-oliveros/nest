import {each} from 'lodash';

import fs from'fs';
import path from'path';
import requireAll from'require-all';

let files = fs.readdirSync(__dirname);
let routes = {};

// require all the routes in the directories
files.forEach((domain) => {
  if (domain.indexOf('.js') < 0) {
    routes[domain] = requireAll(path.join(__dirname, domain));
  }
});

// returns the routes in a nicely formatted string
routes.list = () => {
  let string = '\n';

  // for each folder
  each(this, (domain, domainName) => {
    if (domainName === 'list') return;

    string += `${domainName}\n`;

    // for each route
    each(domain, (route, routeName) => {

      string += `  ${domainName}:${routeName}`;

      // warn on tests disabled
      if (!route.test && routeName !== 'init')
        string += ' (not testable)';

      string += '\n';
    });
    string += '\n';
  });

  return string;
};

// Exports: routes
//
export default routes;
