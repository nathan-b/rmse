const fs = require('fs');
const fsprom = fs.promises;
const path = require('path');

class pako_coder
{
  constructor(pako_path) {
    this.pako = require(pako_path);
  }

  decode(savefile_path) {
    const zipdata = fs.readFileSync(savefile_path, { encoding: 'utf-8' });
    const json = this.pako.inflate(zipdata, { to: "string" });
    return json;
  }

  encode(json_str) {
    return this.pako.deflate(json_str, { to: "string", level: 1 });
  }
}

class lz_coder {
  constructor(lz_path) {
    this.lzstring = require(lz_path);
  }

  decode(savefile_path) {
    const zipdata = fs.readFileSync(savefile_path, { encoding: 'utf-8' });
    const json = this.lzstring.decompressFromBase64(zipdata);
    return json;
  }

  encode(json_str) {
    return this.lzstring.compressToBase64(json_str);
  }
}

function get_rm_root(curr_path) {
  // I'm not super familiar with RPGMaker so I don't know if this function is
  // 100% reliable. I also don't know if this will work on Windows with its
  // weird paths. YOLO
  if (fs.existsSync(path.join(curr_path, 'Game')) ||
      fs.existsSync(path.join(curr_path, 'nw'))) {
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

function build_coder(rm_root) {
  let pakopath = path.join(rm_root, 'js', 'libs', 'pako.min.js');
  let lzpath = path.join(rm_root, 'www', 'js', 'libs', 'lz-string.js');
  let coder = null;

  if (fs.existsSync(pakopath)) {
    // Build pako decoder
    coder = new pako_coder(pakopath);
  } else if (fs.existsSync(lzpath)) {
    // Build lz-string decoder
    coder = new lz_coder(lzpath);
  }

  return coder;
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
  let context = {savefile: file_path};

  // Find the data directory
  let savedir = path.dirname(file_path);
  let maindir = path.dirname(savedir);
  let datadir = path.join(maindir, 'data');
  if (!fs.existsSync(datadir)) {
    console.error('Could not find data dir for ' + file_path);
    return {};
  }

  // Load the context
  let context_files = {
    items: path.join(datadir, 'Items.json'),
    armors: path.join(datadir, 'Armors.json'),
    weapons: path.join(datadir, 'Weapons.json'),
    variables: path.join(datadir, 'System.json')
  };

  Object.entries(context_files).forEach((entry) => {
    [key, filepath] = entry;
    if (fs.existsSync(filepath)) {
      context[key] = fs.readFileSync(filepath, { encoding: 'utf-8' });
    }
  });

  return context;
}

function load(file_path) {
  let rm_root = get_rm_root(file_path);
  if (rm_root === null) {
    console.error('Could not find RPGMaker root dir...aborting');
    return null;
  }
  let coder = build_coder(rm_root);
  let json = coder.decode(file_path);
  let context = get_context(file_path);

  fs.writeFileSync(path.join(path.dirname(file_path), 'out.json'), json);

  context['json_txt'] = json;
  context['rm_root'] = rm_root;
  return context;
}

async function save(file_path, json_str, rm_root) {
  let coder = build_coder(rm_root);
  let strdata = coder.encode(json_str);

  try {
    await fsprom.writeFile(file_path, strdata);
  } catch(err) {
    console.log('Error saving file ' + file_path + ': ' + err);
    return false;
  }
  return true;
}

exports.load = load;
exports.save = save;
exports.get_rm_root = get_rm_root
