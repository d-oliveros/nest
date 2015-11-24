
// Exports: Scraping initialization script
//
// Starts extracting data from reporteindigo
// by searching the word "que", and spawning crawlers to the tags and posts
//
export default {
  start() {
    console.log('Initializing reporteindigo...');

    const searchRoute = require('./search');
    const engine = require('../../src/engine');

    searchRoute.initialize('que', function() {
      engine.start();
    });
  }
};
