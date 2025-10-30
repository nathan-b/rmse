const fs = require('fs');
const fsprom = fs.promises;
const path = require('path');

// Maximum number of backups to keep per save file
const MAX_BACKUPS = 5;

/**
 * Save backups in a hidden directory under the save file's directory
 */
function get_backup_dir(savepath) {
	const saveDir = path.dirname(savepath);
	return path.join(saveDir, '.rmse_backups');
}

/**
 * Get the backup filename with timestamp
 */
function get_backup_filename(savepath) {
	const basename = path.basename(savepath);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	return `${basename}.${timestamp}.backup`;
}

/**
 * Create a backup of the save file before overwriting it
 * Returns the backup file path on success, null on failure
 */
async function create_backup(savepath) {
	try {
		// Check if the file exists (no backup needed for new files)
		if (!fs.existsSync(savepath)) {
			console.log(`No backup needed - file doesn't exist: ${savepath}`);
			return null;
		}

		// Create backup directory if it doesn't exist
		const backup_path = get_backup_dir(savepath);
		if (!fs.existsSync(backup_path)) {
			await fsprom.mkdir(backup_path, { recursive: true });
		}

		// Copy the file to backup location
		const backup_file = path.join(backup_path, get_backup_filename(savepath));
		await fsprom.copyFile(savepath, backup_file);

		console.log(`Created backup: ${backup_file}`);

		// Clean up old backups
		await cleanup_backups(savepath);

		return backup_file;
	} catch (err) {
		console.error(`Failed to create backup for ${savepath}:`, err);
		return null;
	}
}

/**
 * Get all backup files for a given save file, sorted by timestamp (newest first)
 */
async function get_backups(savepath) {
	try {
		const backup_path = get_backup_dir(savepath);
		if (!fs.existsSync(backup_path)) {
			return [];
		}

		const basename = path.basename(savepath);
		const files = await fsprom.readdir(backup_path);

		// Filter for backups of this specific save file
		const backups = files
			.filter((f) => f.startsWith(basename) && f.endsWith('.backup'))
			.map((f) => path.join(backup_path, f));

		// Sort by modification time (newest first)
		const file_stats = await Promise.all(
			backups.map(async (f) => {
				const stats = await fsprom.stat(f);
				return { path: f, mtime: stats.mtime };
			})
		);

		return file_stats.sort((a, b) => b.mtime - a.mtime).map((f) => f.path);
	} catch (err) {
		console.error(`Failed to get backup files for ${savepath}:`, err);
		return [];
	}
}

/**
 * Clean up old backups, keeping only the most recent MAX_BACKUPS
 */
async function cleanup_backups(savepath) {
	try {
		const backups = await get_backups(savepath);

		if (backups.length <= MAX_BACKUPS) {
			return;
		}

		// Delete old backups
		const cleanup = backups.slice(MAX_BACKUPS);
		for (const backup_path of cleanup) {
			await fsprom.unlink(backup_path);
			console.log(`Deleted old backup: ${backup_path}`);
		}
	} catch (err) {
		console.error(`Failed to cleanup old backups for ${savepath}:`, err);
	}
}

/**
 * Restore a save file from a backup
 */
async function restore_backup(backup_path, savepath) {
	try {
		if (!fs.existsSync(backup_path)) {
			throw new Error(`Backup file not found: ${backup_path}`);
		}

		// Create a backup of the current file before restoring
		if (fs.existsSync(savepath)) {
			await create_backup(savepath);
		}

		// Restore the backup
		await fsprom.copyFile(backup_path, savepath);
		console.log(`Restored from backup: ${backup_path} -> ${savepath}`);

		return true;
	} catch (err) {
		console.error(`Failed to restore from backup ${backup_path}:`, err);
		throw err;
	}
}

/**
 * Get information about available backups for a save file
 */
async function backup_info(savepath) {
	try {
		const backups = await get_backups(savepath);

		const info = await Promise.all(
			backups.map(async (backup_path) => {
				const stats = await fsprom.stat(backup_path);
				return {
					path: backup_path,
					filename: path.basename(backup_path),
					size: stats.size,
					created: stats.mtime
				};
			})
		);

		return info;
	} catch (err) {
		console.error(`Failed to get backup info for ${savepath}:`, err);
		return [];
	}
}

exports.create_backup = create_backup;
exports.get_backups = get_backups;
exports.restore_backup = restore_backup;
exports.backup_info = backup_info;
exports.cleanup_backups = cleanup_backups;
