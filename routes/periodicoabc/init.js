
// Exports: Scraping initialization script
//
// Starts extracting data from animalpolitico
// by searching the word "que", and spawning crawlers to the posts
//
export default {
  start() {
    console.log('Initializing periodicoabc...');

    const newsRoute = require('./news');
    const engine = require('../../src/engine');

    newsRoute.initialize(null, function() {
      engine.start();
    });
  }
};
