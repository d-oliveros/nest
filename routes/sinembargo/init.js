
// Exports: Scraping initialization script
//
// Starts extracting data from sinembargo
// by searching the word "taco", and spawning crawlers to the posts
//
export default {
  start() {
    console.log('Initializing sinembargo...');

    const searchRoute = require('./search');
    const engine = require('../../src/engine');

    searchRoute.initialize('taco', function() {
      engine.start();
    });
  }
};
