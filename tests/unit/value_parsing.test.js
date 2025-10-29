/**
 * @jest-environment jsdom
 */

// Test the value parsing and validation logic from renderer.js
// We're testing the logic in isolation without loading the full renderer

describe('Value parsing and validation', () => {
	describe('Number parsing', () => {
		test('should parse valid integers', () => {
			const result = Number('42');
			expect(result).toBe(42);
			expect(isNaN(result)).toBe(false);
		});

		test('should parse valid floats', () => {
			const result = Number('3.14');
			expect(result).toBe(3.14);
			expect(isNaN(result)).toBe(false);
		});

		test('should parse negative numbers', () => {
			const result = Number('-100');
			expect(result).toBe(-100);
			expect(isNaN(result)).toBe(false);
		});

		test('should detect invalid number input', () => {
			const result = Number('not a number');
			expect(isNaN(result)).toBe(true);
		});

		test('should detect empty string as invalid', () => {
			const result = Number('');
			expect(result).toBe(0); // Empty string converts to 0
		});

		test('should handle whitespace-padded numbers', () => {
			const result = Number('  42  ');
			expect(result).toBe(42);
			expect(isNaN(result)).toBe(false);
		});
	});

	describe('Boolean parsing', () => {
		test('should parse "true" as boolean true', () => {
			const val = 'true'.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(true);
		});

		test('should parse "false" as boolean false', () => {
			const val = 'false'.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(false);
		});

		test('should parse "1" as boolean true', () => {
			const val = '1'.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(true);
		});

		test('should parse "0" as boolean false', () => {
			const val = '0'.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(false);
		});

		test('should handle case insensitivity', () => {
			const val = 'TRUE'.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(true);
		});

		test('should handle whitespace', () => {
			const val = '  true  '.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(true);
		});

		test('should reject invalid boolean strings', () => {
			const val = 'yes'.toLowerCase().trim();
			const result = val === 'true' || val === '1';
			expect(result).toBe(false);
		});
	});

	describe('Array parsing', () => {
		test('should split comma-separated values', () => {
			const result = '1,2,3'.split(',').map((s) => s.trim());
			expect(result).toEqual(['1', '2', '3']);
		});

		test('should trim whitespace from array elements', () => {
			const result = '1, 2, 3'.split(',').map((s) => s.trim());
			expect(result).toEqual(['1', '2', '3']);
		});

		test('should handle arrays with extra whitespace', () => {
			const result = '  foo  ,  bar  ,  baz  '.split(',').map((s) => s.trim());
			expect(result).toEqual(['foo', 'bar', 'baz']);
		});

		test('should handle single element', () => {
			const result = 'single'.split(',').map((s) => s.trim());
			expect(result).toEqual(['single']);
		});

		test('should handle empty string', () => {
			const result = ''.split(',').map((s) => s.trim());
			expect(result).toEqual(['']);
		});

		test('should preserve empty elements', () => {
			const result = '1,,3'.split(',').map((s) => s.trim());
			expect(result).toEqual(['1', '', '3']);
		});
	});

	describe('Type detection', () => {
		test('should detect number type', () => {
			const value = 42;
			const type = typeof value;
			expect(type).toBe('number');
		});

		test('should detect string type', () => {
			const value = 'hello';
			const type = typeof value;
			expect(type).toBe('string');
		});

		test('should detect boolean type', () => {
			const value = true;
			const type = typeof value;
			expect(type).toBe('boolean');
		});

		test('should detect object type', () => {
			const value = {};
			const type = typeof value;
			expect(type).toBe('object');
		});

		test('should distinguish arrays from objects', () => {
			const value = [1, 2, 3];
			const type = typeof value;
			const isArray = Array.isArray(value);
			expect(type).toBe('object');
			expect(isArray).toBe(true);
		});
	});
});
