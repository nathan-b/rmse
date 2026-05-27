#!/usr/bin/env node

/**
 * Generate test fixtures for pako codec format detection tests
 *
 * This script creates compressed save files in both MZ and MV formats
 * for testing the pako_codec's ability to detect and handle both formats.
 *
 * Requirements:
 *   npm install --save-dev pako
 *
 * Usage:
 *   node generate_fixtures.js
 */

const fs = require('fs');
const path = require('path');

// Sample save data that resembles a real RPG Maker save
const sample_save_data = {
	system: {
		_framesOnSave: 12345,
		_bgmOnSave: null,
		_bgsOnSave: null,
		_windowTone: null,
		_battleCount: 10,
		_winCount: 8,
		_escapeCount: 2,
		_saveCount: 5,
		_versionId: 123456,
		_savefileId: 1,
		_lastCommandSymbol: 'item'
	},
	screen: { _brightness: 255 },
	timer: { _frames: 0, _working: false },
	switches: { _data: [null, false, false, true] },
	variables: { _data: [null, 100, 50, 0] },
	selfSwitches: { _data: {} },
	actors: {
		_data: [
			null,
			{
				_actorId: 1,
				_name: 'TestHero',
				_nickname: '',
				_profile: '',
				_classId: 1,
				_level: 5,
				_characterName: 'Actor1',
				_characterIndex: 0,
				_faceName: 'Actor1',
				_faceIndex: 0,
				_battlerName: '',
				_exp: { 1: 500 },
				_skills: [1, 2, 3],
				_equips: [{ _itemId: 1 }, { _itemId: 0 }, { _itemId: 0 }, { _itemId: 0 }],
				_hp: 100,
				_mp: 50,
				_tp: 0,
				_paramPlus: [0, 0, 0, 0, 0, 0, 0, 0]
			}
		]
	},
	party: {
		_gold: 1000,
		_steps: 500,
		_lastItem: { _dataClass: '', _itemId: 0 },
		_menuActorId: 1,
		_targetActorId: 1,
		_actors: [1],
		_items: { 1: 5, 2: 3 },
		_weapons: { 1: 1 },
		_armors: { 1: 1 }
	},
	map: {
		_mapId: 1,
		_tileId: 0,
		_eventId: 0,
		_displayX: 0,
		_displayY: 0,
		_parallaxName: '',
		_parallaxX: 0,
		_parallaxY: 0
	},
	player: {
		_vehicleType: 'walk',
		_vehicleGettingOn: false,
		_vehicleGettingOff: false,
		_dashing: false,
		_needsMapReload: false,
		_transferring: false,
		_newMapId: 0,
		_newX: 0,
		_newY: 0,
		_newDirection: 0,
		_fadeType: 0,
		_followers: { visible: true, gathering: false },
		_encounterCount: 0,
		_x: 5,
		_y: 5,
		_realX: 5,
		_realY: 5,
		_moveSpeed: 4,
		_moveFrequency: 6,
		_opacity: 255,
		_blendMode: 0,
		_direction: 2,
		_pattern: 1,
		_priorityType: 1,
		_tileId: 0,
		_characterName: 'Actor1',
		_characterIndex: 0,
		_isObjectCharacter: true,
		_walkAnime: true,
		_stepAnime: false,
		_directionFix: false,
		_through: false,
		_transparent: false,
		_bushDepth: 0,
		_animationId: 0,
		_balloonId: 0,
		_animationPlaying: false,
		_balloonPlaying: false,
		_animationCount: 0,
		_stopCount: 0,
		_jumpCount: 0,
		_jumpPeak: 0,
		_movementSuccess: true
	}
};

function main() {
	console.log('RPGMaker Save Editor - Test Fixture Generator');
	console.log('='.repeat(50));

	// Use pako from npm
	let pako;
	try {
		pako = require('pako');
		console.log('✓ Using pako from npm');
	} catch (err) {
		console.error('❌ Could not load pako');
		console.error('');
		console.error('Please install pako as a dev dependency:');
		console.error('  npm install --save-dev pako');
		process.exit(1);
	}
	const fixtures_dir = __dirname;

	// Sample data as JSON string
	const json_data = JSON.stringify(sample_save_data);

	console.log(`✓ Generated sample save data (${json_data.length} bytes)`);
	console.log('');

	// 1. Generate MZ format (UTF-8 encoded compressed data)
	console.log('Generating MZ UTF-8 format fixture...');
	const mz_compressed = pako.deflate(json_data, { to: 'string', level: 1 });
	const mz_path = path.join(fixtures_dir, 'mz_utf8_format.rmmzsave');
	fs.writeFileSync(mz_path, mz_compressed, { encoding: 'utf-8' });
	console.log(`✓ Created: ${path.basename(mz_path)} (${fs.statSync(mz_path).size} bytes)`);

	// 2. Generate MV format (binary compressed data)
	console.log('Generating MV binary format fixture...');
	const mv_compressed = pako.deflate(json_data, { to: 'string', level: 1 });
	const mv_buffer = Buffer.from(mv_compressed, 'binary');
	const mv_path = path.join(fixtures_dir, 'mv_binary_format.rpgsave');
	fs.writeFileSync(mv_path, mv_buffer);
	console.log(`✓ Created: ${path.basename(mv_path)} (${fs.statSync(mv_path).size} bytes)`);

	// 3. Generate edge case: MV format with MZ extension
	console.log('Generating MV format with MZ extension (edge case)...');
	const edge_path = path.join(fixtures_dir, 'mv_binary_with_mz_ext.rmmzsave');
	fs.writeFileSync(edge_path, mv_buffer);
	console.log(`✓ Created: ${path.basename(edge_path)} (${fs.statSync(edge_path).size} bytes)`);

	// 4. Generate corrupted file
	console.log('Generating corrupted save file...');
	const corrupt_path = path.join(fixtures_dir, 'corrupted.rmmzsave');
	fs.writeFileSync(corrupt_path, 'This is not valid compressed data!', { encoding: 'utf-8' });
	console.log(`✓ Created: ${path.basename(corrupt_path)}`);

	// 5. Generate uncompressed JSON file
	console.log('Generating uncompressed JSON save file...');
	const json_path = path.join(fixtures_dir, 'uncompressed.json');
	fs.writeFileSync(json_path, json_data, { encoding: 'utf-8' });
	console.log(`✓ Created: ${path.basename(json_path)} (${fs.statSync(json_path).size} bytes)`);

	console.log('');
	console.log('='.repeat(50));
	console.log('✅ All fixtures generated successfully!');
	console.log('');
	console.log('Generated files:');
	console.log('  - mz_utf8_format.rmmzsave     (MZ UTF-8 compressed)');
	console.log('  - mv_binary_format.rpgsave    (MV binary compressed)');
	console.log('  - mv_binary_with_mz_ext.rmmzsave (MV format, MZ extension)');
	console.log('  - corrupted.rmmzsave          (Invalid data for error testing)');
	console.log('  - uncompressed.json           (Plain JSON)');
	console.log('');
	console.log('You can now run: npm test');
}

if (require.main === module) {
	main();
}

module.exports = { sample_save_data };
