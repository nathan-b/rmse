const fs = require('fs');
const path = require('path');
const pako = require('pako');

// We need to test the pako_codec class directly
// Since it's not exported, we'll need to work with the full module
const rm_loader = require('../../js/rm_load.js');

describe('pako_codec format detection', () => {
	const fixtures_dir = path.join(__dirname, '../fixtures');
	const test_game_dir = '/tmp/rmse_pako_test';
	const save_dir = path.join(test_game_dir, 'save');
	const data_dir = path.join(test_game_dir, 'data');
	const libs_dir = path.join(test_game_dir, 'js', 'libs');

	beforeAll(() => {
		// Create mock game directory structure
		fs.mkdirSync(save_dir, { recursive: true });
		fs.mkdirSync(data_dir, { recursive: true });
		fs.mkdirSync(libs_dir, { recursive: true });

		// Create game marker file
		fs.writeFileSync(path.join(test_game_dir, 'Game.exe'), '');

		// Create minimal context files
		fs.writeFileSync(path.join(data_dir, 'System.json'), '{}');
		fs.writeFileSync(path.join(data_dir, 'Items.json'), '[]');
		fs.writeFileSync(path.join(data_dir, 'Armors.json'), '[]');
		fs.writeFileSync(path.join(data_dir, 'Weapons.json'), '[]');
		fs.writeFileSync(path.join(data_dir, 'Actors.json'), '[]');
		fs.writeFileSync(path.join(data_dir, 'Classes.json'), '[]');

		// Create symlink to pako in node_modules
		// This allows rm_load.js to require() it properly
		const project_root = path.join(__dirname, '../..');
		const pako_source = path.join(project_root, 'node_modules/pako');
		const pako_target = path.join(test_game_dir, 'node_modules/pako');

		fs.mkdirSync(path.dirname(pako_target), { recursive: true });
		try {
			fs.symlinkSync(pako_source, pako_target, 'dir');
		} catch (err) {
			// Symlink might already exist from previous run
			if (err.code !== 'EEXIST') throw err;
		}

		// Create a minimal pako.min.js that just re-exports from node_modules
		const pako_loader = `module.exports = require('pako');`;
		fs.writeFileSync(path.join(libs_dir, 'pako.min.js'), pako_loader);
	});

	afterAll(() => {
		// Clean up test directory
		if (fs.existsSync(test_game_dir)) {
			fs.rmSync(test_game_dir, { recursive: true, force: true });
		}
	});

	describe('MZ UTF-8 format', () => {
		test('should load .rmmzsave file with MZ UTF-8 encoding', () => {
			const fixture = path.join(fixtures_dir, 'mz_utf8_format.rmmzsave');
			const test_file = path.join(save_dir, 'test.rmmzsave');
			fs.copyFileSync(fixture, test_file);

			const result = rm_loader.load(test_file);

			expect(result).toHaveProperty('json_txt');
			expect(result).toHaveProperty('rm_root', test_game_dir);

			const data = JSON.parse(result.json_txt);
			expect(data).toHaveProperty('party');
			expect(data.party._gold).toBe(1000);
		});

		test('should correctly identify MZ format in save data', () => {
			const fixture = path.join(fixtures_dir, 'mz_utf8_format.rmmzsave');
			const test_file = path.join(save_dir, 'test_mz.rmmzsave');
			fs.copyFileSync(fixture, test_file);

			const result = rm_loader.load(test_file);
			const data = JSON.parse(result.json_txt);

			// Verify the data structure is correct
			expect(data).toHaveProperty('system');
			expect(data).toHaveProperty('player');
			expect(data.player._x).toBe(5);
			expect(data.player._y).toBe(5);
		});
	});

	describe('MV binary format', () => {
		test('should load .rpgsave file with MV binary encoding', () => {
			const fixture = path.join(fixtures_dir, 'mv_binary_format.rpgsave');
			const test_file = path.join(save_dir, 'test.rpgsave');
			fs.copyFileSync(fixture, test_file);

			const result = rm_loader.load(test_file);

			expect(result).toHaveProperty('json_txt');
			const data = JSON.parse(result.json_txt);
			expect(data.party._gold).toBe(1000);
		});

		test('should handle MV format with .rmmzsave extension (fallback)', () => {
			// This tests the edge case where a file has .rmmzsave extension
			// but contains MV binary format data
			const fixture = path.join(fixtures_dir, 'mv_binary_with_mz_ext.rmmzsave');
			const test_file = path.join(save_dir, 'edge_case.rmmzsave');
			fs.copyFileSync(fixture, test_file);

			const result = rm_loader.load(test_file);

			expect(result).toHaveProperty('json_txt');
			const data = JSON.parse(result.json_txt);
			expect(data.party._gold).toBe(1000);
		});
	});

	describe('format preservation on round-trip save/load', () => {
		test('should preserve MZ UTF-8 format when saving', async () => {
			const fixture = path.join(fixtures_dir, 'mz_utf8_format.rmmzsave');
			const test_file = path.join(save_dir, 'roundtrip_mz.rmmzsave');
			fs.copyFileSync(fixture, test_file);

			// Load the file
			const loaded = rm_loader.load(test_file);
			const data = JSON.parse(loaded.json_txt);

			// Modify the data
			data.party._gold = 9999;

			// Save it back
			await rm_loader.save(test_file, JSON.stringify(data), loaded.rm_root);

			// Load it again and verify
			const reloaded = rm_loader.load(test_file);
			const reloaded_data = JSON.parse(reloaded.json_txt);

			expect(reloaded_data.party._gold).toBe(9999);
			expect(reloaded_data.player._x).toBe(5); // Original data preserved
		});

		test('should preserve MV binary format when saving', async () => {
			const fixture = path.join(fixtures_dir, 'mv_binary_format.rpgsave');
			const test_file = path.join(save_dir, 'roundtrip_mv.rpgsave');
			fs.copyFileSync(fixture, test_file);

			// Load the file
			const loaded = rm_loader.load(test_file);
			const data = JSON.parse(loaded.json_txt);

			// Modify the data
			data.party._steps = 12345;

			// Save it back
			await rm_loader.save(test_file, JSON.stringify(data), loaded.rm_root);

			// Load it again and verify
			const reloaded = rm_loader.load(test_file);
			const reloaded_data = JSON.parse(reloaded.json_txt);

			expect(reloaded_data.party._steps).toBe(12345);
			expect(reloaded_data.party._gold).toBe(1000); // Original data preserved
		});
	});

	describe('error handling', () => {
		test('should provide clear error for corrupted .rmmzsave file', () => {
			const fixture = path.join(fixtures_dir, 'corrupted.rmmzsave');
			const test_file = path.join(save_dir, 'corrupted.rmmzsave');
			fs.copyFileSync(fixture, test_file);

			expect(() => {
				rm_loader.load(test_file);
			}).toThrow(/Failed to decompress save file/);
		});

		test('should handle uncompressed JSON files', () => {
			const fixture = path.join(fixtures_dir, 'uncompressed.json');
			const test_file = path.join(save_dir, 'save.json');
			fs.copyFileSync(fixture, test_file);

			const result = rm_loader.load(test_file);

			expect(result).toHaveProperty('json_txt');
			const data = JSON.parse(result.json_txt);
			expect(data.party._gold).toBe(1000);
		});
	});

});
