// Runs in sandbox

// Global state for manually selected game directory
let manual_game_dir = '';

// Set the text of the given element
function set_text(selector, text) {
	const element = document.getElementById(selector);
	if (element) element.innerText = text;
	else console.log('Bad did happen');
}

/**
 * One item within a section.
 * This type of item is for objects associated with a single value.
 *
 * The item owns the ability to update its value by reading from the DOM and
 * then writing to the JSON object representing the savefile.
 */
class value_item {
	constructor(owner, field, label) {
		this.curr_val = owner[field];
		this.jobj = owner;
		this.field = field;
		this.type = typeof owner[field];
		// In JavaScript, arrays are objects...need an extra pass
		if (this.type === 'object' && Array.isArray(owner[field])) {
			this.type = 'array';
		}
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
		if (this.type === 'number') {
			newval = Number(this.input_elem.value);
			if (isNaN(newval)) {
				console.warn(
					`Invalid number input for ${this.labeltext}: "${this.input_elem.value}"`
				);
				// Keep the original value if input is invalid
				return;
			}
		} else if (this.type === 'boolean') {
			// Proper boolean parsing (not just Boolean() which is always truthy for non-empty strings)
			const val = this.input_elem.value.toLowerCase().trim();
			if (val === 'true' || val === '1') {
				newval = true;
			} else if (val === 'false' || val === '0') {
				newval = false;
			} else {
				console.warn(
					`Invalid boolean input for ${this.labeltext}: "${this.input_elem.value}"`
				);
				return;
			}
		} else if (this.type === 'array') {
			newval = this.input_elem.value.split(',').map((s) => s.trim());
		} else {
			// YOLO string
			newval = this.input_elem.value;
		}
		this.jobj[this.field] = newval;
	}

	reset_value() {
		this.input_elem.value = this.curr_val;
	}
}

/**
 * One item within a character section.
 * This type of item is for characters and their stats.
 *
 * The item owns the ability to update its value by reading from the DOM and
 * then writing to the JSON object representing the savefile.
 */
class character_item {
	constructor(actor, context, actors_data, classes_data) {
		this.actor = actor;
		this.ctx = context;
		this.actors_data = actors_data;
		this.classes_data = classes_data;
		// Extract the actual array from _paramPlus (which may be wrapped in RM format)
		this.paramPlus = get_rm_arr(actor, '_paramPlus');
	}

	create_DOM() {
		let parent = document.createElement('div');
		parent.classList.add('section-content');
		parent.classList.add('character-content');
		let header = document.createElement('h3');
		header.classList.add('character-name');
		header.textContent = this.actor._name;
		parent.appendChild(header);

		// Experience field (appears first, before HP/MP/TP)
		if (this.ctx.exp) {
			let exp_div = document.createElement('div');
			exp_div.classList.add('item');
			exp_div.classList.add('character-item');

			let exp_label = document.createElement('p');
			exp_label.classList.add('label');
			exp_label.textContent = this.ctx.exp.name;
			exp_div.appendChild(exp_label);

			let exp_input = document.createElement('input');
			exp_input.setAttribute('type', 'text');
			exp_input.classList.add('value');
			// Get XP for the actor's current class
			exp_input.value = this.actor._exp[this.actor._classId] || 0;
			exp_div.appendChild(exp_input);

			parent.appendChild(exp_div);

			this.ctx.exp['elem'] = exp_input;

			// Display next level XP as a separate read-only line
			if (this.actors_data && this.classes_data && this.actor._actorId) {
				const actor_data = this.actors_data[this.actor._actorId];
				if (actor_data && actor_data.classId) {
					const class_data = this.classes_data[actor_data.classId];
					if (class_data && class_data.expParams) {
						const next_level_xp = exp_for_level(
							this.actor._level + 1,
							class_data.expParams
						);

						let next_level_div = document.createElement('div');
						next_level_div.classList.add('item');
						next_level_div.classList.add('character-item');

						let next_level_label = document.createElement('p');
						next_level_label.classList.add('label');
						next_level_label.textContent = 'Next level';
						next_level_div.appendChild(next_level_label);

						let next_level_value = document.createElement('p');
						next_level_value.classList.add('value');
						next_level_value.textContent = next_level_xp;
						next_level_value.style.lineHeight = '2em';
						next_level_div.appendChild(next_level_value);

						parent.appendChild(next_level_div);
					}
				}
			}
		}

		// These three values are the current levels (HP, MP, TP)
		Object.entries(this.ctx.current).forEach((entry) => {
			let [idx, value] = entry;
			let subvalue = document.createElement('div');
			subvalue.classList.add('item');
			subvalue.classList.add('character-item');

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
			subvalue.classList.add('character-item');

			let sublabel = document.createElement('p');
			sublabel.classList.add('label');
			sublabel.textContent = value.name;
			subvalue.appendChild(sublabel);

			let subinput = document.createElement('input');
			subinput.setAttribute('type', 'text');
			subinput.classList.add('value');
			subinput.value = this.paramPlus[idx];
			subvalue.appendChild(subinput);

			parent.appendChild(subvalue);

			value['elem'] = subinput;
		});

		return parent;
	}

	update_value() {
		// Update experience
		if (this.ctx.exp && this.ctx.exp['elem']) {
			this.actor._exp[this.actor._classId] = Number(this.ctx.exp['elem'].value);
		}

		// Update current stats (HP, MP, TP)
		Object.entries(this.ctx.current).forEach((entry) => {
			let [idx, value] = entry;
			this.actor[idx] = Number(value['elem'].value);
		});

		// Update static params (Max HP, Attack, etc.)
		this.ctx.static.forEach((value, idx) => {
			this.paramPlus[idx] = Number(value['elem'].value);
		});
	}

	reset_value() {
		// Reset experience
		if (this.ctx.exp && this.ctx.exp['elem']) {
			this.ctx.exp['elem'].value = this.actor._exp[this.actor._classId] || 0;
		}

		// Reset current stats (HP, MP, TP)
		Object.entries(this.ctx.current).forEach((entry) => {
			let [idx, value] = entry;
			value['elem'].value = this.actor[idx];
		});

		// Reset static params (Max HP, Attack, etc.)
		this.ctx.static.forEach((value, idx) => {
			value['elem'].value = this.paramPlus[idx];
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
class section {
	constructor(name) {
		this.name = name;
		this.items = [];
	}

	add_item(item) {
		this.items.push(item);
	}

	add_extras(extras_arr) {
		this.extras = extras_arr;
	}

	create_DOM() {
		let section_div = document.createElement('div');
		section_div.classList.add('section');
		let header = document.createElement('h2');
		header.classList.add('section-header');
		header.classList.add('expanded');
		header.textContent = this.name;
		let section_content = document.createElement('div');
		section_content.classList.add('section-content');
		let extras_div = document.createElement('div');

		// Enable expand / collapse behavior
		header.onclick = function (event) {
			if (event.target.classList.contains('expanded')) {
				event.target.classList.remove('expanded');
				event.target.classList.add('collapsed');
				section_content.classList.add('section-hidden');
				extras_div.classList.add('section-hidden');
			} else {
				event.target.classList.add('expanded');
				event.target.classList.remove('collapsed');
				section_content.classList.remove('section-hidden');
				extras_div.classList.remove('section-hidden');
			}
		};

		section_div.appendChild(header);
		section_div.appendChild(section_content);
		this.items.forEach((item) => {
			section_content.appendChild(item.create_DOM());
		});

		// Add dropdown for extra items, if desired
		if (this.extras) {
			extras_div.classList.add('extras');
			// Add a label
			let extras_label = document.createElement('p');
			extras_label.classList.add('extras');
			extras_label.textContent = 'Add to inventory: ';
			extras_div.appendChild(extras_label);

			// Create the dropdown list
			let select_list = document.createElement('select');
			select_list.classList.add('extras');

			// Create and append the options
			this.extras.forEach((extra) => {
				let option = document.createElement('option');
				option.context = extra;
				option.text = extra.name;
				select_list.appendChild(option);
			});
			extras_div.appendChild(select_list);

			// Create the button
			let btnadd = document.createElement('button');
			btnadd.onclick = (event) => {
				let val = select_list.options[select_list.selectedIndex].context;
				// Add the item to the JSON object
				val.obj[val.id] = 1;

				// Create the new item
				let item = new value_item(val.obj, val.id, val.name);
				this.add_item(item);

				// Add to the DOM
				section_content.appendChild(item.create_DOM());
			};
			btnadd.textContent = 'Add item';
			extras_div.appendChild(btnadd);

			section_div.appendChild(extras_div);
		}

		return section_div;
	}

	update_values() {
		this.items.forEach((item) => {
			item.update_value();
		});
	}

	reset_values() {
		this.items.forEach((item) => {
			item.reset_value();
		});
	}
}

function build_item_table(json) {
	let item_table = [];
	json.forEach((item, index) => {
		if (item.name.length !== 0) {
			item_table[index] = {
				name: item.name,
				description: item.description
			};
		}
	});
	return item_table;
}

/**
 * Calculate experience points required for a given level using RPGMaker formula
 * @param {number} level - The level to calculate XP for
 * @param {Array} expParams - [basis, extra, acc_a, acc_b] from Classes.json
 * @returns {number} Experience points required for that level
 */
function exp_for_level(level, expParams) {
	const basis = expParams[0];
	const extra = expParams[1];
	const acc_a = expParams[2];
	const acc_b = expParams[3];
	return Math.round(
		basis *
			Math.pow(level - 1, 0.9 + acc_a / 250) *
			level *
			(level + 1) /
			(6 + Math.pow(level, 2) / 50 / acc_b) +
			(level - 1) * extra
	);
}

function build_attribute_context() {
	let ctx = {
		static: [],
		current: {},
		exp: {}
	};

	ctx.exp = {
		name: 'Current XP'
	};
	ctx.current['_hp'] = {
		name: 'Current HP'
	};
	ctx.current['_mp'] = {
		name: 'Current MP'
	};
	ctx.current['_tp'] = {
		name: 'Current TP'
	};
	ctx.static[0] = {
		name: 'Max HP'
	};
	ctx.static[1] = {
		name: 'Max MP'
	};
	ctx.static[2] = {
		name: 'Attack'
	};
	ctx.static[3] = {
		name: 'Defense'
	};
	ctx.static[4] = {
		name: 'Magic Attack'
	};
	ctx.static[5] = {
		name: 'Magic Defense'
	};
	ctx.static[6] = {
		name: 'Agility'
	};
	ctx.static[7] = {
		name: 'Luck'
	};

	return ctx;
}

/**
 * Loads one set of value_items from the json.
 *
 * RPGM tends to store related values in maps. This is for things like inventory
 * sections. This is a helper function to read these name, value pairs and load
 * them as sections in the section array.
 */
function load_section(name, json_parent, section_arr, ctx, extras) {
	let section_obj = new section(name);

	if (Object.entries(json_parent).length > 0) {
		Object.entries(json_parent).forEach((entry) => {
			const [id, quantity] = entry;

			if (id === '@c' || id === '@') {
				// This is extra metadata, don't display it
				return;
			}

			// Perform context lookup, if available
			let name = String(id);
			if (ctx[id]) {
				name = ctx[id].name;
			}

			// Create the item in the section
			section_obj.add_item(new value_item(json_parent, id, name));
		});
		if (extras) {
			section_obj.add_extras(extras);
		}
		section_arr.push(section_obj);
	}
}

/**
 * RPGM treats some things (like the internal variables) differently
 * from others (like inventory items). This is annoying, but whattaya
 * gonna do?
 *
 * This function is almost the same as the above, with two differences:
 *   1. It iterates over an array instead of object entries
 *   2. It ignores entries whose value is null
 */
function load_array_section(name, json_parent, section_arr, ctx) {
	let section_obj = new section(name);

	if (json_parent.length > 0) {
		json_parent.forEach((value, idx) => {
			if (value) {
				// Perform context lookup, if available
				let name = String(idx);
				if (ctx[idx]) {
					name = ctx[idx];
				}
				// Create the item in the section
				section_obj.add_item(new value_item(json_parent, idx, name));
			}
		});
		section_arr.push(section_obj);
	}
}

/**
 * The party object only contains items which are currently in the inventory. As
 * the user might reasonably want to add new items not currently owned, this
 * function will produce a list of those new items.
 *
 * item_ctx is an array of items, while item_obj associates item IDs with
 * quantities.
 */
function load_extra_items(item_obj, item_ctx) {
	let extra_items = [];
	item_ctx.forEach((item) => {
		if (
			item &&
			item['name'] &&
			item['name'].length > 0 &&
			item['name'][0] !== '-' &&
			!item_obj[item.id]
		) {
			extra_items.push({
				name: item['name'],
				id: item['id'],
				obj: item_obj
			});
		}
	});
	return extra_items;
}

/**
 * RPGMaker uses a custom JSON stringifier that adds some additional metadata to the
 * serialized JSON object. For example, arrays are not stored directly in their parent
 * objects, but instead are stored with a key of "@a" and a value of the array.
 */
function get_rm_arr(obj, field) {
	let arr = obj[field];

	if (Array.isArray(arr)) {
		return arr;
	}

	arr = arr['@a'];

	if (Array.isArray(arr)) {
		return arr;
	}

	return null;
}

function inventory_section(name, json_obj, context, sections) {
	let ctx_obj = {};
	let item_extras = null;
	if (context) {
		ctx_obj = JSON.parse(context);
		item_extras = load_extra_items(json_obj, ctx_obj);
	}
	load_section(name, json_obj, sections, ctx_obj, item_extras);
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
		let common = new section('Common');
		common.add_item(new value_item(json['party'], '_gold', 'Gold'));
		common.add_item(new value_item(json['party'], '_steps', 'Steps'));
		sections.push(common);

		// Character section

		// Note: attributes seem to be fixed in the RPGMaker code itself rather
		//       than defined in the game data. I don't know if the game can
		//       change the definition of these fields, but they are hard-coded
		//       at https://dev.azure.com/je-can-code/RPG%20Maker/_git/rmmz?path=/test-bed/js/rmmz_objects.js&version=GC865a2d06c3b3459496ec380577156ea8ddfb511e&line=2402&lineEnd=2403&lineStartColumn=1&lineEndColumn=1&lineStyle=plain&_a=contents
		let party = new section('Characters');
		// Build the character sections for every character in the party
		let party_actors = get_rm_arr(json['party'], '_actors');
		// Parse Actors.json and Classes.json if available
		let actors_data = context['actors'] ? JSON.parse(context['actors']) : null;
		let classes_data = context['classes'] ? JSON.parse(context['classes']) : null;
		party_actors.forEach((actor_idx) => {
			let party_ctx = build_attribute_context(); // Performs the mapping described above
			let actor_arr = get_rm_arr(json['actors'], '_data');
			party.add_item(
				new character_item(actor_arr[actor_idx], party_ctx, actors_data, classes_data)
			);
		});
		sections.push(party);

		// Inventory
		inventory_section('Items', json['party']['_items'], context['items'], sections);
		inventory_section('Weapons', json['party']['_weapons'], context['weapons'], sections);
		inventory_section('Armor', json['party']['_armors'], context['armors'], sections);
	}

	// Variables section
	if ('variables' in json) {
		let var_ctx = {};
		if (context['variables']) {
			let var_json = JSON.parse(context['variables']);
			var_ctx = var_json.variables;
		}
		load_array_section('Variables', get_rm_arr(json['variables'], '_data'), sections, var_ctx);
	}

	return sections;
}

/**
 * The "palette" is the floating div containing the buttons the user can use to
 * (for example) save changes and otherwise interact with the system.
 *
 * Takes a context object structured like so:
 * {
 *   'filename' => Base name of the file (for printing)
 *   'savefile' => Full path to the save file
 *   'rm_root'  => Root RPGMaker directory path
 *   'json_txt' => Original JSON text from the save file
 *   'object'   => Parsed JSON object
 */
function build_palette(sections, fdata) {
	let palette = document.getElementById('palette');

	let savebtn = document.createElement('button');
	savebtn.textContent = 'Overwrite ' + fdata['filename'];
	savebtn.classList.add('palette-button');
	savebtn.onclick = (event) => {
		handle_save(fdata['savefile'], fdata['object'], fdata['rm_root'], sections, fdata);
	};

	let saveasbtn = document.createElement('button');
	saveasbtn.textContent = 'Save as...';
	saveasbtn.classList.add('palette-button');
	saveasbtn.onclick = (event) => {
		handle_save('', fdata['object'], fdata['rm_root'], sections, fdata);
	};

	let jdumpbtn = document.createElement('button');
	jdumpbtn.textContent = 'Dump raw JSON';
	jdumpbtn.classList.add('palette-button');
	jdumpbtn.onclick = (event) => {
		dump_json(fdata['json_txt'], fdata['rm_root']);
	};

	let resetbtn = document.createElement('button');
	resetbtn.textContent = 'Revert all changes';
	resetbtn.classList.add('palette-button');
	resetbtn.onclick = (event) => {
		sections.forEach((section) => {
			section.reset_values();
		});
	};

	palette.appendChild(savebtn);
	palette.appendChild(saveasbtn);
	palette.appendChild(jdumpbtn);
	palette.appendChild(resetbtn);

	// Add backup UI to the upper right area - will be populated asynchronously
	load_backup_ui(fdata);
}

async function load_backup_ui(fdata) {
	const backup_ui = document.getElementById('backup_ui');

	// Clear any existing backup UI
	backup_ui.innerHTML = '';

	try {
		const backups = await window.ipc_bridge.get_backup_info(fdata['savefile']);

		if (backups.length === 0) {
			return; // No backups, don't show UI
		}

		// Create a container for backup controls
		const backup_container = document.createElement('div');
		backup_container.classList.add('backup-controls');

		// Create dropdown for backup selection
		const backup_select = document.createElement('select');
		backup_select.classList.add('backup-select');

		// Add backups to dropdown
		backups.forEach((backup) => {
			const option = document.createElement('option');
			option.value = backup.path;
			const date = new Date(backup.created);
			option.textContent = `${date.toLocaleString()} (${format_size(backup.size)})`;
			backup_select.appendChild(option);
		});

		// Create restore button
		const restore_btn = document.createElement('button');
		restore_btn.textContent = 'Restore backup';
		restore_btn.classList.add('palette-button');
		restore_btn.onclick = async (event) => {
			const selected_backup = backup_select.value;
			if (!selected_backup) {
				set_text('statustext', 'No backup selected');
				return;
			}

			if (
				confirm(
					'Restore from backup? This will reload the file from the selected backup.'
				)
			) {
				set_text('statustext', 'Restoring from backup...');
				const result = await window.ipc_bridge.restore_backup(
					selected_backup,
					fdata['savefile']
				);

				if (result.success) {
					set_text('statustext', 'Backup restored successfully. Reloading...');
					// Reload the file
					setTimeout(() => {
						window.ipc_bridge.load_file(fdata['savefile'], manual_game_dir, handle_file_load);
					}, 500);
				} else {
					set_text('statustext', 'Failed to restore backup: ' + result.error);
				}
			}
		};

		// Create clear backups button
		const clear_btn = document.createElement('button');
		clear_btn.textContent = 'Clear all backups';
		clear_btn.classList.add('palette-button');
		clear_btn.onclick = async (event) => {
			if (confirm(`Delete all ${backups.length} backup(s)? This cannot be undone.`)) {
				set_text('statustext', 'Clearing backups...');
				const result = await window.ipc_bridge.clear_backups(fdata['savefile']);

				if (result.success) {
					set_text('statustext', `Deleted ${result.count} backup(s)`);
					// Remove backup UI from palette
					backup_container.remove();
				} else {
					set_text('statustext', 'Failed to clear backups: ' + result.error);
				}
			}
		};

		backup_container.appendChild(backup_select);
		backup_container.appendChild(restore_btn);
		backup_container.appendChild(clear_btn);
		backup_ui.appendChild(backup_container);
	} catch (err) {
		console.error('Error loading backup UI:', err);
	}
}

function format_size(bytes) {
	if (bytes < 1024) return bytes + ' B';
	else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
	else return (bytes / 1048576).toFixed(1) + ' MB';
}

function dump_json(obj, rm_root) {
	window.ipc_bridge.dump_json(obj, rm_root, (status) => {
		if (status.length > 0) {
			set_text('status', 'Dumped raw JSON to ' + status);
		} else {
			set_text('status', 'Could not dump raw JSON!');
		}
	});
}

function handle_save(outfile, json, rm_root, sections, fdata) {
	set_text('status', 'Saving ' + outfile);
	// This will update the json object to contain the new values
	sections.forEach((section) => {
		section.update_values();
	});

	// Now save the json
	window.ipc_bridge.save_file(outfile, JSON.stringify(json), rm_root, async (status) => {
		if (status.length > 0) {
			set_text('status', 'Saved ' + status);
			// Refresh backup UI immediately after save
			// Update fdata with the saved file path (in case of "Save as...")
			const saved_fdata = {
				...fdata,
				savefile: status,
				filename: await window.ipc_bridge.basename(status)
			};
			load_backup_ui(saved_fdata);
		} else {
			set_text('status', 'Error saving ' + outfile);
		}
	});
}

/**
 * Parse the JSON data, load each section, and create the DOM.
 *
 * Receives a context object structured like so:
 * {
 *   'savefile' => Full path to the save file
 *   'rm_root'  => Root RPGMaker directory path
 *   'json_txt' => The decoded but unparsed JSON from the save file
 *   <section contexts> => Things like item and variable definitions
 *
 * Produces a context object structured like so:
 * {
 *   'filename' => Base name of the file (for printing)
 *   'savefile' => Full path to the save file
 *   'rm_root'  => Root RPGMaker directory path
 *   'json_txt' => Original JSON text from the save file
 *   'object'   => Parsed JSON object
 */
function handle_file_load(filename, context_obj) {
	set_text('status', 'Handling file load for ' + filename);

	if (!context_obj) {
		set_text('statustext', 'File load cancelled');
		return;
	}
	if (context_obj.error) {
		set_text('statustext', 'Error loading file: ' + context_obj.error);
		console.error('File load failed for ' + filename + ':', context_obj.error);
		return;
	}
	let fdata = {};
	let json_txt = context_obj['json_txt'];
	fdata['filename'] = filename;
	fdata['savefile'] = context_obj['savefile'];
	fdata['rm_root'] = context_obj['rm_root'];
	fdata['json_txt'] = json_txt; // Store original JSON for dumping
	fdata['object'] = JSON.parse(json_txt);

	let sections = build_sections(fdata['object'], context_obj);

	// Clear previous content and palette to prevent memory leaks
	const content_div = document.getElementById('content');
	const palette_div = document.getElementById('palette');
	content_div.innerHTML = '';
	palette_div.innerHTML = '';

	sections.forEach((section) => {
		content_div.appendChild(section.create_DOM());
	});

	build_palette(sections, fdata);
	hide_dropzone();
}

/*
 * Code flows:
 * - File load
 *   drop_handler (renderer.js)          => Get the file path
 *    ipc_bridge.load_json (preload.js)  => Send file path to IPC
 *     load_rm_file (main.js)            => Call into rm_load library
 *      rm_loader.load (rm_load.js)      => Read and decode file, return ctx obj
 *    handle_file_load (renderer.js)     => Build the sections, create DOM
 *
 * - File save
 *   onclick (build_palette) (renderer.js)
 *    handle_save (renderer.js)          => Update JSON
 *     ipc_bridge.save_file (preload.js) => Send JSON to IPC
 *      save_file (main.js)              => Call into rm_load library
 *       rm_loader.save (rm_load.js)     => Encode and write the file
 *     callback (handle_save) (renderer.js) => Write status
 *
 * "Use electron" they said. "It will make things easy" they said...
 */

function hide_dropzone() {
	const dz = document.getElementById('receive_file');
	dz.classList.add('dropzone-hidden');
	const manual_controls = document.getElementById('manual_dir_controls');
	if (manual_controls) {
		manual_controls.style.display = 'none';
	}
}

// Handlers for drag 'n' drop
function drop_handler(ev) {
	ev.preventDefault();
	for (var i = 0; i < ev.dataTransfer.items.length; ++i) {
		if (ev.dataTransfer.items[i].kind === 'file') {
			let file = {
				path: window.ipc_bridge.path_for_file(ev.dataTransfer.items[i].getAsFile())
			};

			set_text('status', 'Loading file ' + file.path);
			window.ipc_bridge.load_file(file.path, manual_game_dir, handle_file_load);
		}
	}
}

function drag_handler(ev) {
	ev.preventDefault();
	ev.stopPropagation();
}

function click_handler(ev) {
	window.ipc_bridge.open_file(manual_game_dir, handle_file_load);
}

function game_dir_handler(ev) {
	window.ipc_bridge.select_game_dir((dir_path) => {
		if (dir_path) {
			manual_game_dir = dir_path;
			set_text('selected_dir', 'Game dir: ' + dir_path);
		}
	});
}

window.addEventListener('DOMContentLoaded', (event) => {
	// Enable drag 'n' drop
	let dropzone = document.getElementById('receive_file');
	dropzone.addEventListener('drop', drop_handler);
	dropzone.addEventListener('dragover', drag_handler);
	dropzone.addEventListener('click', click_handler);

	// Enable manual game directory selection
	let dir_btn = document.getElementById('dir_button');
	dir_btn.addEventListener('click', game_dir_handler);

	// Write the footer
	const version = window.ipc_bridge.version();
	let footer = document.getElementById('footer');
	footer.textContent = 'RPGMaker Save Editor v' + version;
});
