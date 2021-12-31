const fs = require('fs');
const path = require('path');

class pako_decoder
{
  constructor(pako_path) {
    this.pako = require(pako_path);
  }

  decode(savefile_path) {
    const zipdata = fs.readFileSync(savefile_path, { encoding: 'utf-8' });
    const json = this.pako.inflate(zipdata, { to: "string" });
    return json;
  }
}

class lz_decoder {
  constructor(lz_path) {
    this.lzstring = require(lz_path);
  }

  decode(savefile_path) {
    const zipdata = fs.readFileSync(savefile_path, { encoding: 'utf-8' });
    const json = this.lzstring.decompressFromBase64(zipdata);
    return json;
  }
}

function get_rm_root(curr_path) {
  // I'm not super familiar with RPGMaker so I don't know if this function is
  // 100% reliable. I also don't know if this will work on Windows with its
  // weird paths. YOLO
  if (fs.existsSync(path.join(curr_path, 'Game'))) {
    // This is currently the rm root!
    return curr_path;
  }

  let updir = path.dirname(curr_path);
  if (updir == curr_path) {
    // End the recursion
    return null;
  }

  return get_rm_root(updir);
}

function build_decoder(rm_root) {
  let pakopath = path.join(rm_root, 'js', 'libs', 'pako.min.js');
  let lzpath = path.join(rm_root, 'www', 'js', 'libs', 'lz-string.js');
  let decoder = null;

  if (fs.existsSync(pakopath)) {
    // Build pako decoder
    decoder = new pako_decoder(pakopath);
  } else if (fs.existsSync(lzpath)) {
    // Build lz-string decoder
    decoder = new lz_decoder(lzpath);
  }

  return decoder;
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
  let context = {};

  // Find the data directory
  let savedir = path.dirname(file_path);
  let maindir = path.dirname(savedir);
  let datadir = path.join(maindir, 'data');
  if (!fs.existsSync(datadir)) {
    console.log('Could not find data dir for ' + file_path);
    return {};
  }

  // Load the context
  let items = path.join(datadir, 'Items.json');
  let armors = path.join(datadir, 'Armors.json');

  if (fs.existsSync(items)) {
    context['items'] = fs.readFileSync(items, { encoding: 'utf-8' });
  }
  if (fs.existsSync(armors)) {
    context['armors'] = fs.readFileSync(armors, { encoding: 'utf-8' });
  }

  return context;
}

function load(file_path) {
  let rm_root = get_rm_root(file_path);
  let decoder = build_decoder(rm_root);

  let json = decoder.decode(file_path);
  let context = get_context(file_path);
  context['savefile'] = json;
  return context;
}

exports.load = load;
exports.get_rm_root = get_rm_root
