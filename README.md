# RPGMaker Save Editor

This is a tool for editing RPGMaker save files. It should support save files written by both RPG Maker MV and MZ. Support for older versions is not planned.

It uses Node.js for the backend and Electron for the GUI, which means you can interact with it using `npm`.

## Installation and running

### Clone the repository

```
git clone https://github.com/nathan-b/rmse
```

### Install dependencies

```
npm install
```

### Run

```
npm start
```

## Loading a save file

You can load a save file into RMSE either by dragging and dropping from your file browser or by clicking on the friendly green box and selecting your save file from the resulting dialog box.

## Editing the save file

Hopefully the interface is fairly straightforward.

Each section can be collapsed or expanded by clicking on it.

Edited values do not take effect until you click one of the save buttons.

### Editing inventory

The inventory sections (items, armor, weapons) only show the current contents of your inventory. If you would like to add a new item that you currently don't have, you can use the dropdown box below each section to choose an item to add.
Selecting an item and then clicking the 'Add' button will add that item to your inventory with a quantity of 1. You can then increase the quantity further if you would like.

If an inventory section does not show up, this is because your party currently does not have any of that type of inventory.

### Editing characters

You can currently only edit characters who are in your active party. The ability to edit characters not currently in your party is a possible future enhancement. Let me know if this functionality would be useful, and that might inspire me to work on it :).

Note that for most games, the given character attributes are additive on top of what the character's attributes already are based on their current level. This means that the values you see in RMSE will not match the values you see inside the game. This is
normal and expected.

Not all games use every character attribute, but the save files still include these attributes. Do not be alarmed if you see an attribute your game does not use. All is fine. Remain calm.

### Editing variables

Variables are internal values and switches used by the game and are not normally exposed to the user. As a result, they can sometimes have strange or uninteligible names. Be aware that messing with values inside the variables section has a fairly high
likelihood of messing up your save in some way. Use with caution, and maintain backups.

## Saving the file

You can either overwrite the file you just loaded or save the file under a new name.

### Automatic backups

RMSE automatically creates a backup of your save file before overwriting it. Backups are stored in a `.rmse_backups` folder next to your save files. The 5 most recent backups are kept, and older backups are automatically deleted. This protects you from accidental data loss.

### Restoring from backup

If backups exist for the current save file, backup controls will appear in the upper right corner of the window. You can:

- **Select a backup** from the dropdown to see when it was created and its file size
- **Click "Restore backup"** to restore the selected backup. This will reload the file with the backup's contents.
- **Click "Clear all backups"** to delete all backups for this save file (this cannot be undone)

The backup dropdown only appears when backups are available.

### Dumping raw JSON

RMSE can both save and load the raw JSON values used by the save file. This functionality will probably not be useful to you, but it might under a few circumstances:

- Your game uses a custom plugin that RMSE doesn't read, and you want to edit those values.
- You want to edit something that RMSE doesn't load (such as characters not in the active party).
- You wish to explore the save file or edit it by hand, and you just need RMSE to unpack the save file for you.

Once you have dumped the raw JSON and then edited it, you can open the file using the normal way (by dropping it or selecting it) and load it back into RMSE. At that point, use Save as... to save it as a new (or existing) save file inside your
game directory.

NOTE: For technical reasons, you can't save the file outside the game's directory. RMSE needs to use the game directory to figure out how to save the file. However, if you don't want to save the file in the saves directory, you can save it somewhere else
inside the game directory. This restriction does not apply to JSON files, which can be saved wherever you please.
