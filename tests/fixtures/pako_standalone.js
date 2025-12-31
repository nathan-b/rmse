/**
 * Standalone pako bundle for testing
 * This wraps the npm pako module into a format that can be used
 * by rm_load.js when required from the test game directory
 */

// Export pako from node_modules in a way that mimics the minified version
// used by RPG Maker games
module.exports = require('pako');
