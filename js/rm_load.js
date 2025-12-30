const fs = require('fs');
const fsprom = fs.promises;
const path = require('path');
const backup = require('./backup.js');

class null_codec {
	constructor(rm_root) {
		this.rm_root = rm_root;
	}

	decode(savefile_path) {
		try {
			const json = fs.readFileSync(savefile_path, {
				encoding: 'utf-8'
			});
			return json;
		} catch (err) {
			const error_msg = err?.message || err?.toString() || String(err);
			throw new Error(`Failed to read save file: ${error_msg}`);
		}
	}

	encode(json_str) {
		return json_str;
	}
}

class pako_codec {
	constructor(pako_path) {
		try {
			this.pako = require(pako_path);
			if (!this.pako || typeof this.pako.inflate !== 'function') {
				throw new Error(`Pako library loaded but inflate function not found`);
			}
			this.use_utf8_format = false; // Track which format is being used
		} catch (err) {
			throw new Error(
				`Failed to load pako library from ${pako_path}: ${err?.message || err}`
			);
		}
	}

	rmmv_decode(savefile_path) {
		// RPG Maker MV writes binary compressed data
		try {
			const zipdata = fs.readFileSync(savefile_path);
			const json = this.pako.inflate(zipdata, {
				to: 'string'
			});
			this.use_utf8_format = false;
			return json;
		} catch (err) {
			const error_msg = err?.message || err?.toString() || String(err);
			const error_code = err?.code || 'unknown';
			throw new Error(
				`Failed to decompress save file (RMMV method): ${error_msg} (code: ${error_code})`
			);
		}
	}

	rmmz_decode(savefile_path) {
		// RPG Maker MZ writes compressed binary data as UTF-8 string (for some reason)
		try {
			const zipdata_utf8 = fs.readFileSync(savefile_path, { encoding: 'utf-8' });
			const json = this.pako.inflate(zipdata_utf8, { to: 'string' });
			this.use_utf8_format = true;
			return json;
		} catch (err) {
			const error_msg = err?.message || err?.toString() || String(err);
			const error_code = err?.code || 'unknown';
			throw new Error(
				`Failed to decompress save file (RMMZ method): ${error_msg} (code: ${error_code})`
			);
		}
	}

	decode(savefile_path) {
		try {
			if (path.extname(savefile_path) === '.rmmzsave') {
				return this.rmmz_decode(savefile_path);
			}
		} catch (err) {
			console.warn(
				`Failed to decode as RMMZ save file, trying RMMV method: ${err?.message || err}`
			);
		}
		return this.rmmv_decode(savefile_path);
	}

	encode(json_str) {
		const compressed = this.pako.deflate(json_str, {
			to: 'string',
			level: 1
		});

		// If the file was loaded using UTF-8 format (MZ), keep it in that format
		// Otherwise return binary Buffer (MV)
		if (this.use_utf8_format) {
			return compressed; // Return as string for UTF-8 encoding
		} else {
			// Convert string to Buffer for binary writing
			return Buffer.from(compressed, 'binary');
		}
	}
}

class lz_codec {
	constructor(lz_path) {
		try {
			this.lzstring = require(lz_path);
			if (!this.lzstring || typeof this.lzstring.decompressFromBase64 !== 'function') {
				throw new Error(
					`LZ-String library loaded but decompressFromBase64 function not found`
				);
			}
		} catch (err) {
			throw new Error(
				`Failed to load lz-string library from ${lz_path}: ${err?.message || err}`
			);
		}
	}

	decode(savefile_path) {
		try {
			const zipdata = fs.readFileSync(savefile_path, {
				encoding: 'utf-8'
			});
			const json = this.lzstring.decompressFromBase64(zipdata);
			return json;
		} catch (err) {
			const error_msg = err?.message || err?.toString() || String(err);
			const error_code = err?.code || 'unknown';
			throw new Error(`Failed to decompress save file: ${error_msg} (code: ${error_code})`);
		}
	}

	encode(json_str) {
		return this.lzstring.compressToBase64(json_str);
	}
}

function get_rm_root(curr_path) {
	// I'm not super familiar with RPGMaker so I don't know if this function is
	// 100% reliable. I also don't know if this will work on Windows with its
	// weird paths. YOLO
	if (
		fs.existsSync(path.join(curr_path, 'Game')) ||
		fs.existsSync(path.join(curr_path, 'nw')) ||
		fs.existsSync(path.join(curr_path, 'Game.exe')) ||
		fs.existsSync(path.join(curr_path, 'nw.exe'))
	) {
		// This is currently the rm root!
		return curr_path;
	}

	// This solution was suggested by Galactic647 on GitHub
	if (fs.existsSync(path.join(curr_path, 'data', 'System.json'))) {
		if (curr_path.endsWith('www')) {
			return path.dirname(curr_path);
		} else {
			return curr_path;
		}
	}

	let updir = path.dirname(curr_path);
	if (updir === curr_path) {
		// End the recursion
		return null;
	}

	return get_rm_root(updir);
}

function build_codec(file_path, rm_root) {
	let pakopath = path.join(rm_root, 'js', 'libs', 'pako.min.js');
	let lzpath = path.join(rm_root, 'www', 'js', 'libs', 'lz-string.js');
	let codec = null;

	if (path.extname(file_path) === '.json') {
		codec = new null_codec(rm_root);
	} else if (fs.existsSync(pakopath)) {
		// Build pako decoder
		codec = new pako_codec(pakopath);
	} else if (fs.existsSync(lzpath)) {
		// Build lz-string decoder
		codec = new lz_codec(lzpath);
	}

	return codec;
}

/**
 * Get the context for the savefile.
 *
 * A save file needs some context from the game engine to make sense. This
 * context is stored in JSON files in certain locations within the game
 * directory. This function will pull those files and pass them with the
 * savefile data.
 */
function get_context(file_path) {
	let context = {
		savefile: file_path
	};

	// Find the data directory
	let savedir = path.dirname(file_path);
	let maindir = path.dirname(savedir);
	let datadir = path.join(maindir, 'data');
	if (!fs.existsSync(datadir)) {
		console.warn('Could not find data dir for ' + file_path + ' in ' + datadir);
		// check secondary location
		datadir = path.join(maindir, 'www', 'data');
		if (!fs.existsSync(datadir)) {
			console.error('Could not find data dir for ' + file_path + ' in ' + datadir);
			console.error('Giving up attempt to locate data directory.');
			return {};
		}
	}

	console.info('Data dir: ' + datadir);

	// Load the context
	let context_files = {
		items: path.join(datadir, 'Items.json'),
		armors: path.join(datadir, 'Armors.json'),
		weapons: path.join(datadir, 'Weapons.json'),
		variables: path.join(datadir, 'System.json'),
		actors: path.join(datadir, 'Actors.json'),
		classes: path.join(datadir, 'Classes.json')
	};

	Object.entries(context_files).forEach(([key, filepath]) => {
		console.debug(`Loading ${filepath}...`);

		if (!fs.existsSync(filepath)) {
			console.warn(`Missing context file ${filepath}, skipping.`);
			return; // skip this entry
		}

		try {
			context[key] = fs.readFileSync(filepath, { encoding: 'utf-8' });
		} catch (err) {
			console.error(`Failed to read context file ${filepath}: ${err.message}`);
			return; // skip success message
		}

		console.debug('Success');
	});

	return context;
}

function load(file_path) {
	let rm_root = get_rm_root(file_path);
	if (rm_root === null) {
		throw new Error('Could not find RPGMaker root directory');
	}

	let codec = build_codec(file_path, rm_root);
	if (codec === null) {
		throw new Error('Could not determine save file format');
	}

	let json = codec.decode(file_path);
	let context = get_context(file_path);

	context['json_txt'] = json;
	context['rm_root'] = rm_root;
	return context;
}

async function save(file_path, json_str, rm_root) {
	let codec = build_codec(file_path, rm_root);
	let strdata = codec.encode(json_str);

	try {
		// Create backup before overwriting
		const backupPath = await backup.create_backup(file_path);
		if (backupPath) {
			console.log(`Backup created at: ${backupPath}`);
		}

		await fsprom.writeFile(file_path, strdata);
	} catch (err) {
		console.log('Error saving file ' + file_path + ': ' + err);
		return '';
	}
	return file_path;
}

exports.load = load;
exports.save = save;
exports.get_rm_root = get_rm_root;
exports.backup = backup;
