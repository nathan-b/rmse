// Runs in sandbox

// Set the text of the given element
function set_text(selector, text) {
  const element = document.getElementById(selector);
  if (element) element.innerText = text;
  else console.log("Bad did happen");
}

/**
 * One item within an inventory section.
 * This type of item is for objects associated with a quantity.
 *
 * The item owns the ability to update its value by reading from the DOM and
 * then writing to the JSON object representing the savefile.
 */
class inventory_item
{
  constructor(owner, field, label) {
    this.curr_val = owner[field];
    this.jobj = owner;
    this.field = field;
    this.type = typeof owner[field];
    this.labeltext = label;
  }

  create_DOM() {
    let parent = document.createElement('div');
    parent.classList.add('item');
    let label = document.createElement('p');
    label.classList.add('label');
    label.textContent = this.labeltext;
    let input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.classList.add('value');
    input.value = this.curr_val;

    // Save the element for later
    this.input_elem = input;

    parent.appendChild(label);
    parent.appendChild(input);

    return parent;
  }

  update_value() {
    var newval = '';
    if (this.type == 'number') {
      newval = Number(this.input_elem.value);
    } else if (this.type == 'boolean') {
      newval = Boolean(this.input_elem.value);
    } else {
      // YOLO string
      newval = this.input_elem.value
    }
    this.jobj[this.field] = newval;
  }
}

/**
 * One item within a character section.
 * This type of item is for characters and their stats.
 *
 * The item owns the ability to update its value by reading from the DOM and
 * then writing to the JSON object representing the savefile.
 */
class character_item
{
  constructor(actor, context) {
    this.actor = actor;
    this.ctx = context;
  }

  create_DOM() {
    let parent = document.createElement('div');
    parent.classList.add('character-item');
    let header = document.createElement('h3');
    header.classList.add('character-name');
    header.textContent = this.actor._name;
    parent.appendChild(header);

    // These three values are the current levels
    Object.entries(this.ctx.current).forEach((entry) => {
      let [idx, value] = entry;
      let subvalue = document.createElement('div');
      subvalue.classList.add('item');

      let sublabel = document.createElement('p');
      sublabel.classList.add('label');
      sublabel.textContent = value.name;
      subvalue.appendChild(sublabel);

      let subinput = document.createElement('input');
      subinput.setAttribute('type', 'text');
      subinput.classList.add('value');
      subinput.value = this.actor[idx];
      subvalue.appendChild(subinput);

      parent.appendChild(subvalue);

      value['elem'] = subinput;
    });

    // And of course these have to be just subtly different from the above
    this.ctx.static.forEach((value, idx) => {
      let subvalue = document.createElement('div');
      subvalue.classList.add('item');

      let sublabel = document.createElement('p');
      sublabel.classList.add('label');
      sublabel.textContent = value.name;
      subvalue.appendChild(sublabel);

      let subinput = document.createElement('input');
      subinput.setAttribute('type', 'text');
      subinput.classList.add('value');
      subinput.value = this.actor._paramPlus[idx];
      subvalue.appendChild(subinput);

      parent.appendChild(subvalue);

      value['elem'] = subinput;
    });

    return parent;
  }

  update_value() {
    Object.entries(this.ctx.current).forEach((entry) => {
      let [idx, value] = entry;
      this.actor[idx] = Number(value['elem'].value);
    });

    this.ctx.static.forEach((value, idx) => {
      this.actor._paramPlus[idx] = Number(value['elem'].value);
    });
  }
}

/**
 * One section of the savefile.
 * Sections are delimited by headers and group logical collections of items.
 *
 * Sections do not create their own values (because that is owned by the
 * higher-level parsing code that understands savefiles), but they own the
 * created values.
 */
class section
{
  constructor(name) {
    this.name = name;
    this.items = [];
  }

  add_item(item) {
    this.items.push(item);
  }

  create_DOM() {
    let section_div = document.createElement('div');
    section_div.classList.add('section');
    let header = document.createElement('h2');
    let section_content = document.createElement('div');
    section_content.classList.add('section-content');
    header.textContent = this.name;

    section_div.appendChild(header);
    section_div.appendChild(section_content);
    this.items.forEach((item) => { section_content.appendChild(item.create_DOM()); });

    return section_div;
  }

  update_values() {
    this.items.forEach((item) => { item.update_value(); });
  }
}

function build_item_table(json) {
  let item_table = [];
  json.forEach((item, index) => {
    if (item.name.length != 0) {
      item_table[index] = {'name': item.name, 'description': item.description};
    }
  });
  return item_table;
}

function build_attribute_context() {
  let ctx = {
    static: [],
    current: {}
  };

  ctx.current['_hp'] = {'name': 'Current HP'};
  ctx.current['_mp'] = {'name': 'Current MP'};
  ctx.current['_tp'] = {'name': 'Current TP'};
  ctx.static[0] = {'name': 'Max HP'};
  ctx.static[1] = {'name': 'Max MP'};
  ctx.static[2] = {'name': 'Attack'};
  ctx.static[3] = {'name': 'Defense'};
  ctx.static[4] = {'name': 'Magic Attack'};
  ctx.static[5] = {'name': 'Magic Defense'};
  ctx.static[6] = {'name': 'Agility'};
  ctx.static[7] = {'name': 'Luck'};

  return ctx;
}

/**
 * Build the sections for the editor.
 * This function handles the semantic section building, while the section and
 * item classes handle building the actual UI.
 */
function build_sections(json, context) {
  let sections = [];
  if ('party' in json) {
    // Common section
    let common = new section("Common");
    common.add_item(new inventory_item(json['party'], '_gold', 'Gold'));
    common.add_item(new inventory_item(json['party'], '_steps', 'Steps'));
    sections.push(common);

    // Character section

    // Note: attributes seem to be fixed in the RPGMaker code itself rather
    //       than defined in the game data. I don't know if the game can
    //       change the definition of these fields, but they are hard-coded
    //       at https://dev.azure.com/je-can-code/RPG%20Maker/_git/rmmz?path=/test-bed/js/rmmz_objects.js&version=GC865a2d06c3b3459496ec380577156ea8ddfb511e&line=2402&lineEnd=2403&lineStartColumn=1&lineEndColumn=1&lineStyle=plain&_a=contents
    let party = new section("Characters");
      // Build the character sections for every character in the party
    json['party']['_actors'].forEach((actor_idx) => {
      let party_ctx = build_attribute_context(); // Performs the mapping described above
      party.add_item(new character_item(json['actors']['_data'][actor_idx], party_ctx));
    });
    sections.push(party);

    // Item section
    let inventory = new section("Inventory");

      // Parse context JSON, if available
    let item_ctx = {};
    if (context['items']) {
      item_ctx = JSON.parse(context['items']);
    }

    if (Object.entries(json['party']['_items']).length > 0) {
      Object.entries(json['party']['_items']).forEach(entry => {
        const [id, quantity] = entry;
        let name = String(id);
        if (item_ctx[id]) {
          name = item_ctx[id].name;
        }
        inventory.add_item(new inventory_item(json['party']['_items'], id, name));
      });
      sections.push(inventory);
    }

    // Armor section
    let armor = new section("Armor");

    let armor_ctx = {}
    if (context['armors']) {
      armor_ctx = JSON.parse(context['armors']);
    }

    if (Object.entries(json['party']['_armors']).length > 0) {
      Object.entries(json['party']['_armors']).forEach(entry => {
        const [id, quantity] = entry;
        let name = String(id);
        if (armor_ctx[id]) {
          name = armor_ctx[id].name;
        }
        armor.add_item(new inventory_item(json['party']['_armors'], id, name));
      });
      sections.push(armor);
    }
  }

  return sections;
}

function handle_file_load(filename, context_obj) {
  set_text('status', 'Handling file load for ' + filename);

  let json_txt = context_obj['savefile'];
  let json = JSON.parse(json_txt);
  let sections = build_sections(json, context_obj);

  const content_div = document.getElementById('content');

  sections.forEach((section) => { content_div.appendChild(section.create_DOM()); });
}

// Handlers for drag 'n' drop
function drop_handler(ev) {
  ev.preventDefault();
  for (var i = 0; i < ev.dataTransfer.items.length; ++i) {
    if (ev.dataTransfer.items[i].kind === 'file') {
      let file = ev.dataTransfer.items[i].getAsFile();
      set_text('status', 'Loading file ' + file.path);
      window.rm_loader.load_json(file.path, handle_file_load);
    }
  }
}
function drag_handler(ev) {
  ev.preventDefault();
  ev.stopPropagation();
}

window.addEventListener('DOMContentLoaded', (event) => {
  // Enable drag 'n' drop
  let dropzone = document.getElementById('receive_file');
  dropzone.addEventListener('drop', drop_handler);
  dropzone.addEventListener('dragover', drag_handler);
});
