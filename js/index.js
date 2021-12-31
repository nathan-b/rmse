#!/usr/bin/env node

const pako = require('/home/nathan/Downloads/games/Other/star-knightess-aura-linux/js/libs/pako.min.js');
const fs = require('fs');

//
// Helper functions
//

this.zip_to_json = function(ziptext) {
	try {
		const json = pako.inflate(ziptext, { to: "string" });
		return json;
	} catch (e) {
		console.log("Error decoding file: " + e);
	}
};

this.load_json = function(filename) {
	const data = fs.readFileSync(filename, { encoding: 'utf8' });
	return this.zip_to_json(data);
};

//
// Main logic
//

// Read arguments
const args = process.argv.slice(2);
var opts = {game_dir: '', savefile: ''};

while (typeof(i = args.shift()) !== 'undefined' ) {
  switch (i) {
	case '-g':
		opts['game_dir'] = args.shift();
		break;
	default:
		opts['savefile'].push(i);
		break;
	}
}

// Validate arguments
if (opts['game_dir'] == '' || typeof(opts['game_dir']) == 'undefined') {
	// TODO: Check to see if current directory is a game data directory
	console.log('Error: No game data directory specified');
}

// Load the pako library from the data dir


opts['files'].forEach((file) => {
	console.log("Processing " + file);
	var out;
	if (opts['deflate']) {
		console.log("Deflating " + file);
		out = pako.deflate(fs.readFileSync(file, { encoding: 'utf8' }),
		                   { to: "string", level: 1 });
	} else {
		console.log("Inflating " + file);
		//out = pako.inflate(fs.readFileSync(file, { encoding: 'utf8' }),
		//                   { to: "string"});
		out = this.load_json(file);
	}
	console.log(out);
});
