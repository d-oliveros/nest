
// Exports: Scraping initialization script
//
// Starts extracting data from animalpolitico
// by searching the word "que", and spawning crawlers to the posts
//
export default {
  start() {
    console.log('Initializing animalpolitico...');

    const searchRoute = require('./search');
    const engine = require('../../src/engine');

    searchRoute.initialize('que', function() {
      engine.start();
    });
  }
};
