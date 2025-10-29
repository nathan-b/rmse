# Testing Guide

This directory contains tests for the RPGMaker Save Editor.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── rm_load.test.js     # Tests for save file loading/saving logic
│   └── value_parsing.test.js # Tests for value validation logic
├── integration/             # Integration tests for full workflows
│   └── file_operations.test.js # End-to-end file load/save tests
└── fixtures/                # Test data and sample files
    └── test_save.json      # Sample save file for testing
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## What's Tested

### Unit Tests

**rm_load.js**:

- Finding RPGMaker root directory
- Codec selection (JSON, Pako, LZ-string)
- Error handling for missing files/directories
- Save file loading and saving

**value_parsing.test.js**:

- Number parsing and validation
- Boolean parsing (true/false, 1/0)
- Array parsing with whitespace trimming
- Type detection

### Integration Tests

**file_operations.test.js**:

- Complete load-modify-save workflow
- JSON file loading and saving
- Error handling for invalid paths
- Game directory structure detection

## Writing New Tests

### Unit Test Example

```javascript
describe('MyModule', () => {
	test('should do something', () => {
		const result = myFunction(input);
		expect(result).toBe(expected);
	});
});
```

### Integration Test Example

```javascript
describe('Workflow test', () => {
	test('should load and save file', async () => {
		const loaded = rm_loader.load(path);
		const saved = await rm_loader.save(newPath, data, root);
		expect(saved).toBe(newPath);
	});
});
```

## Test Fixtures

Test fixtures (sample data) are stored in `tests/fixtures/`. These include:

- Sample save files
- Mock game directory structures
- Context files (Items.json, etc.)

## Known Limitations

- DOM-dependent code in renderer.js cannot be easily unit tested
- Some fs.promises mocking limitations require integration tests for full coverage
- Pako and LZ-string compression tests require the actual libraries from game directories

## Continuous Integration

Tests should pass before merging any changes. Run `npm test` before committing.
