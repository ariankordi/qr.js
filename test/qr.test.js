/**
 * @file Smoke and regression tests for the QR code generator.
 *
 * These run on Node's built-in test runner (`node --test`), so no extra
 * dependencies are required for this pure-ESM library. They exercise the
 * public `QRCode.generate` entry point across every supported mode, with
 * particular attention to the recently refactored paths:
 * - the `ALPHANUMERIC_MAP` lookup (alphanumeric mode, both even- and
 *   odd-length inputs), and
 * - the `TextEncoder`-based UTF-8 encoding (octet mode, including multi-byte
 *   and non-BMP/surrogate-pair characters).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import QRCode from '../qr.js';

/** The matrix side length for a given version (cf. getByteSizeForVersion). */
const sizeForVersion = (/** @type {number} */ ver) => 4 * ver + 17;

/**
 * Asserts that a generated matrix is a square grid containing only the
 * binary module values 0 and 1.
 */
const assertValidMatrix = (/** @type {number[][]} */ matrix) => {
	assert.ok(Array.isArray(matrix), 'matrix should be an array');
	const n = matrix.length;
	assert.ok(n > 0, 'matrix should be non-empty');
	for (const row of matrix) {
		assert.equal(row.length, n, 'matrix should be square');
		for (const cell of row) {
			assert.ok(cell === 0 || cell === 1, 'modules should be 0 or 1');
		}
	}
};

test('version 1 produces a 21x21 matrix', () => {
	const matrix = QRCode.generate('1', { version: 1 });
	assert.equal(matrix.length, sizeForVersion(1));
	assertValidMatrix(matrix);
});

test('numeric mode encodes digit strings', () => {
	assertValidMatrix(QRCode.generate('1234567890', { mode: 'numeric' }));
});

test('alphanumeric mode encodes even- and odd-length inputs', () => {
	// "HI" is even (exercises only the paired loop); "HELLO WORLD" is odd
	// (also exercises the trailing single-character branch).
	assertValidMatrix(QRCode.generate('HI', { mode: 'alphanumeric' }));
	assertValidMatrix(QRCode.generate('HELLO WORLD', { mode: 'alphanumeric' }));
});

test('alphanumeric mode rejects characters outside its charset', () => {
	// Lowercase/extended characters are not in ALPHANUMERIC_MAP, so the
	// generator should refuse rather than silently mis-encode.
	assert.throws(() => QRCode.generate('hello!', { mode: 'alphanumeric' }));
});

test('octet mode encodes ASCII strings', () => {
	assertValidMatrix(QRCode.generate('Hello, world!', { mode: 'octet' }));
});

test('octet mode UTF-8 encodes multi-byte (BMP) characters', () => {
	assertValidMatrix(QRCode.generate('héllo café ☃', { mode: 'octet' }));
});

test('octet mode UTF-8 encodes non-BMP characters (surrogate pairs)', () => {
	// An emoji is a surrogate pair encoded as a 4-byte UTF-8 sequence by
	// TextEncoder; this previously hit the manual encoder's edge cases.
	assertValidMatrix(QRCode.generate('hi 😀', { mode: 'octet' }));
});

test('octet mode accepts a pre-encoded byte array', () => {
	assertValidMatrix(QRCode.generate([0x48, 0x69], { mode: 'octet' }));
});

test('generation is deterministic for identical inputs', () => {
	const a = QRCode.generate('HELLO WORLD', { mode: 'alphanumeric' });
	const b = QRCode.generate('HELLO WORLD', { mode: 'alphanumeric' });
	assert.deepEqual(a, b);
});

test('auto mode selection works without an explicit mode', () => {
	assertValidMatrix(QRCode.generate('12345'));        // -> numeric
	assertValidMatrix(QRCode.generate('HELLO'));        // -> alphanumeric
	assertValidMatrix(QRCode.generate('Hello world!')); // -> octet
});

test('all four ECC levels generate valid matrices', () => {
	for (const ecclevel of ['L', 'M', 'Q', 'H']) {
		assertValidMatrix(QRCode.generate('TEST', { mode: 'alphanumeric', ecclevel }));
	}
});

test('version 2 produces a 25x25 matrix and exercises alignment pattern placement', () => {
	// Version 2 is the smallest version that includes alignment patterns,
	// covering the alignment-pattern matrix-fill branch (lines 553-562).
	const matrix = QRCode.generate('HELLO WORLD', { version: 2, mode: 'alphanumeric' });
	assert.equal(matrix.length, sizeForVersion(2));
	assertValidMatrix(matrix);
});

test('version 7 exercises alignment patterns and version information blocks', () => {
	// Version 7 is the smallest version that embeds version information
	// (needsVersionInfo returns true), covering lines 221-222 and 565-574.
	// A long numeric string is used to fill the larger data capacity.
	const matrix = QRCode.generate('01234567890123456789', { version: 7, mode: 'numeric' });
	assert.equal(matrix.length, sizeForVersion(7));
	assertValidMatrix(matrix);
});
