const fs = require('fs');
const fsprom = fs.promises;
const path = require('path');
const backup = require('../../js/backup.js');

// Suppress console output during tests
beforeAll(() => {
	jest.spyOn(console, 'log').mockImplementation(() => {});
	jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
	console.log.mockRestore();
	console.error.mockRestore();
});

describe('Backup module', () => {
	const testDir = path.join(__dirname, '../fixtures/backup_test');
	const testFile = path.join(testDir, 'test.rmmzsave');
	const backupDir = path.join(testDir, '.rmse_backups');

	beforeEach(async () => {
		// Create test directory and file
		await fsprom.mkdir(testDir, { recursive: true });
		await fsprom.writeFile(testFile, 'test save data');
	});

	afterEach(async () => {
		// Clean up test files
		try {
			if (fs.existsSync(backupDir)) {
				const files = await fsprom.readdir(backupDir);
				for (const file of files) {
					await fsprom.unlink(path.join(backupDir, file));
				}
				await fsprom.rmdir(backupDir);
			}
			if (fs.existsSync(testFile)) {
				await fsprom.unlink(testFile);
			}
			if (fs.existsSync(testDir)) {
				await fsprom.rmdir(testDir);
			}
		} catch (err) {
			console.error('Cleanup error:', err);
		}
	});

	describe('create_backup', () => {
		test('should create a backup file', async () => {
			const backupPath = await backup.create_backup(testFile);

			expect(backupPath).toBeTruthy();
			expect(fs.existsSync(backupPath)).toBe(true);
			expect(backupPath).toContain('.rmse_backups');
			expect(backupPath).toContain('test.rmmzsave');
		});

		test('should copy file contents correctly', async () => {
			const originalContent = 'test save data';
			await fsprom.writeFile(testFile, originalContent);

			const backupPath = await backup.create_backup(testFile);
			const backupContent = await fsprom.readFile(backupPath, 'utf-8');

			expect(backupContent).toBe(originalContent);
		});

		test('should create backup directory if it does not exist', async () => {
			expect(fs.existsSync(backupDir)).toBe(false);

			await backup.create_backup(testFile);

			expect(fs.existsSync(backupDir)).toBe(true);
		});

		test('should return null if file does not exist', async () => {
			const nonExistentFile = path.join(testDir, 'nonexistent.rmmzsave');
			const result = await backup.create_backup(nonExistentFile);

			expect(result).toBeNull();
		});

		test('should handle errors gracefully', async () => {
			// Try to backup a directory (should fail)
			const result = await backup.create_backup(testDir);

			expect(result).toBeNull();
		});
	});

	describe('get_backups', () => {
		test('should return empty array when no backups exist', async () => {
			const backups = await backup.get_backups(testFile);

			expect(backups).toEqual([]);
		});

		test('should return list of backup files', async () => {
			await backup.create_backup(testFile);
			await new Promise((resolve) => setTimeout(resolve, 10));
			await backup.create_backup(testFile);

			const backups = await backup.get_backups(testFile);

			expect(backups.length).toBe(2);
			backups.forEach((b) => {
				expect(b).toContain('.rmse_backups');
				expect(b).toContain('.backup');
			});
		});

		test('should return backups sorted by newest first', async () => {
			// Create first backup
			await backup.create_backup(testFile);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Create second backup
			await backup.create_backup(testFile);

			const backups = await backup.get_backups(testFile);

			// Second backup should be first in list
			const stats1 = await fsprom.stat(backups[0]);
			const stats2 = await fsprom.stat(backups[1]);

			expect(stats1.mtime.getTime()).toBeGreaterThanOrEqual(stats2.mtime.getTime());
		});

		test('should only return backups for specific file', async () => {
			const otherFile = path.join(testDir, 'other.rmmzsave');
			await fsprom.writeFile(otherFile, 'other data');

			await backup.create_backup(testFile);
			await backup.create_backup(otherFile);

			const backups = await backup.get_backups(testFile);

			expect(backups.length).toBe(1);
			expect(backups[0]).toContain('test.rmmzsave');

			// Cleanup
			await fsprom.unlink(otherFile);
		});
	});

	describe('cleanup_backups', () => {
		test('should keep only 5 most recent backups', async () => {
			// Create 7 backups
			for (let i = 0; i < 7; i++) {
				await backup.create_backup(testFile);
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			const backups = await backup.get_backups(testFile);

			expect(backups.length).toBe(5);
		});

		test('should not delete backups if less than 5 exist', async () => {
			await backup.create_backup(testFile);
			await new Promise((resolve) => setTimeout(resolve, 10));
			await backup.create_backup(testFile);

			const backupsBefore = await backup.get_backups(testFile);
			await backup.cleanup_backups(testFile);
			const backupsAfter = await backup.get_backups(testFile);

			expect(backupsBefore.length).toBe(2);
			expect(backupsAfter.length).toBe(2);
		});

		test('should delete oldest backups first', async () => {
			// Create 6 backups with delays
			const backupPaths = [];
			for (let i = 0; i < 6; i++) {
				const bp = await backup.create_backup(testFile);
				backupPaths.push(bp);
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			const remainingBackups = await backup.get_backups(testFile);

			// First backup should be deleted
			expect(fs.existsSync(backupPaths[0])).toBe(false);
			// Last 5 should exist
			expect(remainingBackups.length).toBe(5);
		});
	});

	describe('restore_backup', () => {
		test('should restore file from backup', async () => {
			const originalContent = 'original data';
			await fsprom.writeFile(testFile, originalContent);

			const backupPath = await backup.create_backup(testFile);

			// Small delay to ensure file system operations complete
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Modify the original file
			await fsprom.writeFile(testFile, 'modified data');

			// Restore from backup
			await backup.restore_backup(backupPath, testFile);

			const restoredContent = await fsprom.readFile(testFile, 'utf-8');
			expect(restoredContent).toBe(originalContent);
		});

		test('should create backup before restoring', async () => {
			await fsprom.writeFile(testFile, 'original');
			const backupPath = await backup.create_backup(testFile);

			await new Promise((resolve) => setTimeout(resolve, 10));
			await fsprom.writeFile(testFile, 'modified');

			const backupsBefore = await backup.get_backups(testFile);
			await backup.restore_backup(backupPath, testFile);
			const backupsAfter = await backup.get_backups(testFile);

			// Should have created a backup of 'modified' before restoring
			expect(backupsAfter.length).toBeGreaterThan(backupsBefore.length);
		});

		test('should throw error if backup file does not exist', async () => {
			const nonExistentBackup = path.join(backupDir, 'nonexistent.backup');

			await expect(backup.restore_backup(nonExistentBackup, testFile)).rejects.toThrow();
		});
	});

	describe('backup_info', () => {
		test('should return backup information', async () => {
			await backup.create_backup(testFile);

			const info = await backup.backup_info(testFile);

			expect(info.length).toBe(1);
			expect(info[0]).toHaveProperty('path');
			expect(info[0]).toHaveProperty('filename');
			expect(info[0]).toHaveProperty('size');
			expect(info[0]).toHaveProperty('created');
		});

		test('should return empty array if no backups exist', async () => {
			const info = await backup.backup_info(testFile);

			expect(info).toEqual([]);
		});

		test('should include file size in info', async () => {
			await fsprom.writeFile(testFile, 'test data with some content');
			await backup.create_backup(testFile);

			const info = await backup.backup_info(testFile);

			expect(info[0].size).toBeGreaterThan(0);
		});
	});
});
