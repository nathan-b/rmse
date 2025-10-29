const fs = require('fs');
const path = require('path');
const rm_loader = require('../../js/rm_load.js');

describe('File operations integration tests', () => {
	const fixturesPath = path.join(__dirname, '../fixtures');
	const testSavePath = path.join(fixturesPath, 'test_save.json');
	const testGameRoot = fixturesPath;

	describe('Load and save workflow', () => {
		test('should load a JSON save file', () => {
			// Create a mock game structure
			const gamePath = path.join(fixturesPath, 'Game');
			const savePath = path.join(fixturesPath, 'save');
			const testFile = path.join(savePath, 'test.json');

			try {
				// Setup
				if (!fs.existsSync(gamePath)) {
					fs.mkdirSync(gamePath, { recursive: true });
				}
				if (!fs.existsSync(savePath)) {
					fs.mkdirSync(savePath, { recursive: true });
				}

				const testData = {
					party: {
						_gold: 1000,
						_steps: 500
					}
				};
				fs.writeFileSync(testFile, JSON.stringify(testData));

				// Test loading
				const result = rm_loader.load(testFile);

				expect(result).toBeTruthy();
				expect(result).toHaveProperty('json_txt');
				expect(result).toHaveProperty('rm_root');
				expect(result.rm_root).toBe(fixturesPath);

				// Verify the JSON was loaded correctly
				const parsed = JSON.parse(result.json_txt);
				expect(parsed.party._gold).toBe(1000);
				expect(parsed.party._steps).toBe(500);
			} finally {
				// Cleanup
				if (fs.existsSync(testFile)) {
					fs.unlinkSync(testFile);
				}
				if (fs.existsSync(savePath)) {
					fs.rmdirSync(savePath);
				}
				if (fs.existsSync(gamePath)) {
					fs.rmdirSync(gamePath);
				}
			}
		});

		test('should save a JSON file', async () => {
			const outputPath = path.join(fixturesPath, 'output.json');

			try {
				const testData = {
					party: {
						_gold: 2000,
						_steps: 1000
					}
				};

				const result = await rm_loader.save(
					outputPath,
					JSON.stringify(testData),
					fixturesPath
				);

				expect(result).toBe(outputPath);
				expect(fs.existsSync(outputPath)).toBe(true);

				// Verify the saved content
				const saved = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
				expect(saved.party._gold).toBe(2000);
				expect(saved.party._steps).toBe(1000);
			} finally {
				// Cleanup
				if (fs.existsSync(outputPath)) {
					fs.unlinkSync(outputPath);
				}
			}
		});

		test('should handle load-modify-save workflow', async () => {
			const gamePath = path.join(fixturesPath, 'Game');
			const savePath = path.join(fixturesPath, 'save');
			const inputFile = path.join(savePath, 'input.json');
			const outputFile = path.join(savePath, 'output.json');

			try {
				// Setup
				if (!fs.existsSync(gamePath)) {
					fs.mkdirSync(gamePath, { recursive: true });
				}
				if (!fs.existsSync(savePath)) {
					fs.mkdirSync(savePath, { recursive: true });
				}

				const originalData = {
					party: {
						_gold: 100,
						_steps: 50
					}
				};
				fs.writeFileSync(inputFile, JSON.stringify(originalData));

				// Load
				const loaded = rm_loader.load(inputFile);
				expect(loaded).toBeTruthy();

				// Modify
				const data = JSON.parse(loaded.json_txt);
				data.party._gold = 9999;
				data.party._steps = 5000;

				// Save
				const saveResult = await rm_loader.save(
					outputFile,
					JSON.stringify(data),
					loaded.rm_root
				);

				expect(saveResult).toBe(outputFile);

				// Verify modifications persisted
				const saved = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
				expect(saved.party._gold).toBe(9999);
				expect(saved.party._steps).toBe(5000);
			} finally {
				// Cleanup
				if (fs.existsSync(inputFile)) {
					fs.unlinkSync(inputFile);
				}
				if (fs.existsSync(outputFile)) {
					fs.unlinkSync(outputFile);
				}
				if (fs.existsSync(savePath)) {
					fs.rmdirSync(savePath);
				}
				if (fs.existsSync(gamePath)) {
					fs.rmdirSync(gamePath);
				}
			}
		});
	});

	describe('Error handling', () => {
		test('should handle missing game root gracefully', () => {
			const invalidPath = '/absolutely/invalid/path/that/does/not/exist.json';

			expect(() => {
				rm_loader.load(invalidPath);
			}).toThrow('Could not find RPGMaker root directory');
		});

		test('should handle save errors gracefully', async () => {
			const invalidPath = '/invalid/readonly/path/file.json';

			const result = await rm_loader.save(invalidPath, '{"test": "data"}', '/some/root');

			expect(result).toBe('');
		});
	});
});
