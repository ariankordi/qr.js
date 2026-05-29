/**
 * @file qr.js -- QR code generator in Javascript (revision 2011-01-19)
 * @license CC0-1.0
 * This source code is in the public domain; if your jurisdiction does not
 * recognize the public domain the terms of Creative Commons CC0 license
 * apply. In the other words, you can always do what you want.
 * @author Kang Seonghoon <public+qrjs@mearie.org>.
 */

/* Quick overview: QR code composed of 2D array of modules (a rectangular
 * area that conveys one bit of information); some modules are fixed to help
 * the recognition of the code, and remaining data modules are further divided
 * into 8-bit code words which are augmented by Reed-Solomon error correcting
 * codes (ECC). There could be multiple ECCs, in the case the code is so large
 * that it is helpful to split the raw data into several chunks.
 *
 * The number of modules is determined by the code's "version", ranging from 1
 * (21x21) to 40 (177x177). How many ECC bits are used is determined by the
 * ECC level (L/M/Q/H). The number and size (and thus the order of generator
 * polynomial) of ECCs depend to the version and ECC level.
 */

// @ts-check

/** @typedef {string|ArrayLike<number>} InputData */

/**
 * per-version information (cf. JIS X 0510:2004 pp. 30--36, 71)
 *
 * [0]: the degree of generator polynomial by ECC levels
 * [1]: # of code blocks by ECC levels
 * [2]: left-top positions of alignment patterns
 *
 * the number in this table (in particular, [0]) does not exactly match with
 * the numbers in the specification. see augmentEccCode below for the reason.
 */
const VERSIONS = [
	null,
	[[10, 7,17,13], [ 1, 1, 1, 1], []],
	[[16,10,28,22], [ 1, 1, 1, 1], [4,16]],
	[[26,15,22,18], [ 1, 1, 2, 2], [4,20]],
	[[18,20,16,26], [ 2, 1, 4, 2], [4,24]],
	[[24,26,22,18], [ 2, 1, 4, 4], [4,28]],
	[[16,18,28,24], [ 4, 2, 4, 4], [4,32]],
	[[18,20,26,18], [ 4, 2, 5, 6], [4,20,36]],
	[[22,24,26,22], [ 4, 2, 6, 6], [4,22,40]],
	[[22,30,24,20], [ 5, 2, 8, 8], [4,24,44]],
	[[26,18,28,24], [ 5, 4, 8, 8], [4,26,48]],
	[[30,20,24,28], [ 5, 4,11, 8], [4,28,52]],
	[[22,24,28,26], [ 8, 4,11,10], [4,30,56]],
	[[22,26,22,24], [ 9, 4,16,12], [4,32,60]],
	[[24,30,24,20], [ 9, 4,16,16], [4,24,44,64]],
	[[24,22,24,30], [10, 6,18,12], [4,24,46,68]],
	[[28,24,30,24], [10, 6,16,17], [4,24,48,72]],
	[[28,28,28,28], [11, 6,19,16], [4,28,52,76]],
	[[26,30,28,28], [13, 6,21,18], [4,28,54,80]],
	[[26,28,26,26], [14, 7,25,21], [4,28,56,84]],
	[[26,28,28,30], [16, 8,25,20], [4,32,60,88]],
	[[26,28,30,28], [17, 8,25,23], [4,26,48,70,92]],
	[[28,28,24,30], [17, 9,34,23], [4,24,48,72,96]],
	[[28,30,30,30], [18, 9,30,25], [4,28,52,76,100]],
	[[28,30,30,30], [20,10,32,27], [4,26,52,78,104]],
	[[28,26,30,30], [21,12,35,29], [4,30,56,82,108]],
	[[28,28,30,28], [23,12,37,34], [4,28,56,84,112]],
	[[28,30,30,30], [25,12,40,34], [4,32,60,88,116]],
	[[28,30,30,30], [26,13,42,35], [4,24,48,72,96,120]],
	[[28,30,30,30], [28,14,45,38], [4,28,52,76,100,124]],
	[[28,30,30,30], [29,15,48,40], [4,24,50,76,102,128]],
	[[28,30,30,30], [31,16,51,43], [4,28,54,80,106,132]],
	[[28,30,30,30], [33,17,54,45], [4,32,58,84,110,136]],
	[[28,30,30,30], [35,18,57,48], [4,28,56,84,112,140]],
	[[28,30,30,30], [37,19,60,51], [4,32,60,88,116,144]],
	[[28,30,30,30], [38,19,63,53], [4,28,52,76,100,124,148]],
	[[28,30,30,30], [40,20,66,56], [4,22,48,74,100,126,152]],
	[[28,30,30,30], [43,21,70,59], [4,26,52,78,104,130,156]],
	[[28,30,30,30], [45,22,74,62], [4,30,56,82,108,134,160]],
	[[28,30,30,30], [47,24,77,65], [4,24,52,80,108,136,164]],
	[[28,30,30,30], [49,25,81,68], [4,28,56,84,112,140,168]]];

/**
 * mode constants (cf. Table 2 in JIS X 0510:2004 p. 16)
 * @enum {number}
 */
const Mode = {
	TERMINATOR: 0,
	NUMERIC: 1,
	ALPHANUMERIC: 2,
	OCTET: 4,
	KANJI: 8
};

// validation regexps
const NUMERIC_REGEXP = /^\d*$/;
const ALPHANUMERIC_REGEXP = /^[A-Za-z0-9 $%*+\-./:]*$/;
const ALPHANUMERIC_OUT_REGEXP = /^[A-Z0-9 $%*+\-./:]*$/;

/**
 * ECC levels (cf. Table 22 in JIS X 0510:2004 p. 45)
 * @enum {number}
 */
const EccLevel = {
	L: 1,
	M: 0,
	Q: 3,
	H: 2
};

/**
 * GF(2^8)-to-integer mapping with a reducing polynomial x^8+x^4+x^3+x^2+1
 * invariant: GF256_MAP[GF256_INVERT_MAP[i]] == i for all i in [1,256)
 * @type {number[]}
 */
const GF256_MAP = [];
const GF256_INVERT_MAP = [-1];
for (let i = 0, v = 1; i < 255; ++i) {
	GF256_MAP.push(v);
	GF256_INVERT_MAP[v] = i;
	v = (v * 2) ^ (v >= 128 ? 0x11d : 0);
}

/**
 * generator polynomials up to degree 30
 * (should match with polynomials in JIS X 0510:2004 Appendix A)
 *
 * generator polynomial of degree K is product of (x-\alpha^0), (x-\alpha^1),
 * ..., (x-\alpha^(K-1)). by convention, we omit the K-th coefficient (always 1)
 * from the result; also other coefficients are written in terms of the exponent
 * to \alpha to avoid the redundant calculation. (see also {@link calculateEccCode})
 * @type {number[][]}
 */
const GF256_GENERATED_POLY = [[]];
for (let i = 0; i < 30; ++i) {
	const previous = GF256_GENERATED_POLY[i];
	const poly = [];
	for (let j = 0; j <= i; ++j) {
		const a = (j < i ? GF256_MAP[previous[j]] : 0);
		const b = GF256_MAP[(i + (previous[j - 1] || 0)) % 255];
		poly.push(GF256_INVERT_MAP[a ^ b]);
	}
	GF256_GENERATED_POLY.push(poly);
}

/**
 * alphanumeric character mapping
 * (cf. Table 5 in JIS X 0510:2004 p. 19)
 * @type {Record<string, number>}
 */
const ALPHANUMERIC_MAP = Array.from('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:')
	.reduce((map, ch, i) => {
		map[ch] = i;
		return map;
	}, /** @type {Record<string, number>} */ ({}));

/**
 * mask functions in terms of row # and column #
 * (cf. Table 20 in JIS X 0510:2004 p. 42)
 * @type {((i: number, j: number) => boolean)[]}
 */
const MASKS = [
	(i, j) => (i + j) % 2 == 0,
	i => i % 2 == 0,
	(_i, j) => j % 3 == 0,
	(i, j) => (i + j) % 3 == 0,
	(i, j) => ((Math.trunc(i / 2)) + (Math.trunc(j / 3))) % 2 == 0,
	(i, j) => (i * j) % 2 + (i * j) % 3 == 0,
	(i, j) => ((i * j) % 2 + (i * j) % 3) % 2 == 0,
	(i, j) => ((i + j) % 2 + (i * j) % 3) % 2 == 0];

/**
 * returns true when the version information has to be embeded.
 * @returns {boolean}
 */
const needsVersionInfo = (/** @type {number} */ ver) => ver > 6;

/**
 * returns the size of entire QR code for given version.
 * @returns {number}
 */
const getByteSizeForVersion = (/** @type {number} */ ver) => 4 * ver + 17;

/**
 * returns the number of bits available for code words in this version.
 * @returns {number}
 */
const numFullBits = function (/** @type {number} */ ver) {
	/*
	 * |<--------------- n --------------->|
	 * |        |<----- n-17 ---->|        |
	 * +-------+                ///+-------+ ----
	 * |       |                ///|       |    ^
	 * |  9x9  |       @@@@@    ///|  9x8  |    |
	 * |       | # # # @5x5@ # # # |       |    |
	 * +-------+       @@@@@       +-------+    |
	 *       #                               ---|
	 *                                        ^ |
	 *       #                                |
	 *     @@@@@       @@@@@       @@@@@      | n
	 *     @5x5@       @5x5@       @5x5@   n-17
	 *     @@@@@       @@@@@       @@@@@      | |
	 *       #                                | |
	 * //////                                 v |
	 * //////#                               ---|
	 * +-------+       @@@@@       @@@@@        |
	 * |       |       @5x5@       @5x5@        |
	 * |  8x9  |       @@@@@       @@@@@        |
	 * |       |                                v
	 * +-------+                             ----
	 *
	 * when the entire code has n^2 modules and there are m^2-3 alignment
	 * patterns, we have:
	 * - 225 (= 9x9 + 9x8 + 8x9) modules for finder patterns and
	 *   format information;
	 * - 2n-34 (= 2(n-17)) modules for timing patterns;
	 * - 36 (= 3x6 + 6x3) modules for version information, if any;
	 * - 25m^2-75 (= (m^2-3)(5x5)) modules for alignment patterns
	 *   if any, but 10m-20 (= 2(m-2)x5) of them overlaps with
	 *   timing patterns.
	 */
	const v = /** @type {number[][]} */ (VERSIONS[ver]);
	console.assert(Array.isArray(v), 'unknown version');
	let numBits = 16 * ver * ver + 128 * ver + 64; // finder, timing and format info.
	if (needsVersionInfo(ver)) {
		numBits -= 36;
	} // version information
	if (v[2].length) { // alignment patterns
		numBits -= 25 * v[2].length * v[2].length - 10 * v[2].length - 55;
	}
	return numBits;
};

/**
 * returns the number of bits available for data portions (i.e. excludes ECC
 * bits but includes mode and length bits) in this version and ECC level.
 * @returns {number}
 */
const numDataBits = function (/** @type {number} */ ver, /** @type {EccLevel} */ ecclevel) {
	let num = numFullBits(ver) & ~7; // no sub-octet code words
	const v = /** @type {number[][]} */ (VERSIONS[ver]);
	console.assert(Array.isArray(v), 'unknown version');
	num -= 8 * v[0][ecclevel] * v[1][ecclevel]; // ecc bits
	return num;
};

/**
 * returns the number of bits required for the length of data.
 * (cf. Table 3 in JIS X 0510:2004 p. 16)
 * @returns {number}
 */
const numDataLengthBits = function (/** @type {number} */ ver, /** @type {Mode} */ mode) {
	switch (mode) {
		case Mode.NUMERIC: return (ver < 10 ? 10 : ver < 27 ? 12 : 14);
		case Mode.ALPHANUMERIC: return (ver < 10 ? 9 : ver < 27 ? 11 : 13);
		case Mode.OCTET: return (ver < 10 ? 8 : 16);
		case Mode.KANJI: return (ver < 10 ? 8 : ver < 27 ? 10 : 12);
		default:
			throw new Error('unknown mode');
	}
};

/**
 * returns the maximum length of data possible in given configuration.
 * @returns {number}
 */
const getMaxDataLength = function (/** @type {number} */ ver, /** @type {Mode} */ mode, /** @type {EccLevel} */ ecclevel) {
	const bits = numDataBits(ver, ecclevel) - 4 -
		numDataLengthBits(ver, mode); // 4 for mode bits
	switch (mode) {
		case Mode.NUMERIC:
			return (Math.trunc(bits / 10)) * 3 + (bits % 10 < 4 ? 0 : bits % 10 < 7 ? 1 : 2);
		case Mode.ALPHANUMERIC:
			return (Math.trunc(bits / 11)) * 2 + (bits % 11 < 6 ? 0 : 1);
		case Mode.OCTET:
			return Math.trunc(bits / 8);
		case Mode.KANJI:
			return Math.trunc(bits / 13);
		default:
			throw new Error('unknown mode');
	}
};

/**
 * checks if the given data can be encoded in given mode, and returns
 * the converted data for the further processing if possible. otherwise
 * returns null.
 *
 * this function does not check the length of data; it is a duty of
 * encode function below (as it depends on the version and ECC level too).
 * @returns {InputData|null} the converted data, or null when invalid.
 */
const validateData = function (/** @type {Mode} */ mode, /** @type {InputData} */ data) {
	switch (mode) {
		case Mode.NUMERIC:
			if (!NUMERIC_REGEXP.test(String(data))) {
				return null;
			}
			return data;

		case Mode.ALPHANUMERIC:
			if (typeof data !== 'string') {
				throw new TypeError('expected data to be string');
			}
			if (!ALPHANUMERIC_REGEXP.test(data)) {
				return null;
			}
			return data.toUpperCase();

		case Mode.OCTET:
			if (typeof data === 'string') {
				// encode the string as a UTF-8 byte sequence.
				return new TextEncoder().encode(data);
			}
			return data;

		default:
			// unreachable for the modes accepted by the public API; the
			// explicit branch keeps every code path returning a value.
			return null;
	}
};

/**
 * returns the code words (sans ECC bits) for given data and configurations.
 * requires data to be preprocessed by validateData. no length check is
 * performed, and everything has to be checked before calling this function.
 * @returns {number[]}
 */
const encode = function (/** @type {number} */ ver, /** @type {Mode} */ mode,
	/** @type {InputData} */ data, /** @type {number} */ maxbuflen) {
	const buf = [];
	let bits = 0;
	let remaining = 8;
	const dataSize = data.length;

	const pack = (/** @type {number} */ x, /** @type {number} */ n) => {
		// this function is intentionally no-op when n=0.
		if (n >= remaining) {
			buf.push(bits | (x >> (n -= remaining)));
			while (n >= 8) {
				buf.push((x >> (n -= 8)) & 255);
			}
			bits = 0;
			remaining = 8;
		}
		if (n > 0) {
			bits |= (x & ((1 << n) - 1)) << (remaining -= n);
		}
	};

	const nLengthBits = numDataLengthBits(ver, mode);
	pack(mode, 4);
	if (nLengthBits === undefined) {
		throw new Error('unknown version/mode combination');
	}
	pack(dataSize, nLengthBits);

	switch (mode) {
		case Mode.NUMERIC: {
			// validateData guarantees a string for the numeric mode.
			const text = /** @type {string} */ (data);
			// `i` is declared outside the loop because the trailing 1-2 digits
			// are packed after it using the final value of `i`.
			let i = 2;
			for (; i < dataSize; i += 3) {
				// eslint-disable-next-line unicorn/prefer-string-slice -- TODO: determine if we can replace safely
				pack(Number.parseInt(text.substring(i - 2, i + 1), 10), 10);
			}
			// eslint-disable-next-line unicorn/prefer-string-slice -- TODO: determine if we can replace safely
			pack(Number.parseInt(text.substring(i - 2), 10), [0,4,7][dataSize % 3]);
			break;
		}

		case Mode.ALPHANUMERIC: {
			// validateData guarantees an uppercased string for this mode.
			const text = /** @type {string} */ (data);
			// `i` is declared outside the loop because the trailing odd
			// character is packed after it using the final value of `i`.
			let i = 1;
			for (; i < dataSize; i += 2) {
				pack(ALPHANUMERIC_MAP[text.charAt(i - 1)] * 45 +
					ALPHANUMERIC_MAP[text.charAt(i)], 11);
			}
			if (dataSize % 2 == 1) {
				pack(ALPHANUMERIC_MAP[text.charAt(i - 1)], 6);
			}
			break;
		}

		case Mode.OCTET: {
			// validateData guarantees a byte sequence for the octet mode.
			const bytes = /** @type {ArrayLike<number>} */ (data);
			for (let i = 0; i < dataSize; ++i) {
				pack(bytes[i], 8);
			}
			break;
		}
	}

	// final bits. it is possible that adding terminator causes the buffer
	// to overflow, but then the buffer truncated to the maximum size will
	// be valid as the truncated terminator mode bits and padding is
	// identical in appearance (cf. JIS X 0510:2004 sec 8.4.8).
	pack(Mode.TERMINATOR, 4);
	if (remaining < 8) {
		buf.push(bits);
	}

	// the padding to fill up the remaining space. we should not add any
	// words when the overflow already occurred.
	while (buf.length + 1 < maxbuflen) {
		buf.push(0xec, 0x11);
	}
	if (buf.length < maxbuflen) {
		buf.push(0xec);
	}
	return buf;
};

/**
 * calculates ECC code words for given code words and generator polynomial.
 *
 * this is quite similar to CRC calculation as both Reed-Solomon and CRC use
 * the certain kind of cyclic codes, which is effectively the division of
 * zero-augumented polynomial by the generator polynomial. the only difference
 * is that Reed-Solomon uses GF(2^8), instead of CRC's GF(2), and Reed-Solomon
 * uses the different generator polynomial than CRC's.
 * @returns {number[]}
 */
const calculateEccCode = function (/** @type {number[]} */ poly, /** @type {number[]} */ genPoly) {
	const modulus = poly.slice(0);
	const polyLength = poly.length;
	const polyGenLength = genPoly.length;
	for (let i = 0; i < polyGenLength; ++i) {
		modulus.push(0);
	}
	for (let i = 0; i < polyLength;) {
		const quotient = GF256_INVERT_MAP[modulus[i++]];
		if (quotient >= 0) {
			for (let j = 0; j < polyGenLength; ++j) {
				modulus[i + j] ^= GF256_MAP[(quotient + genPoly[j]) % 255];
			}
		}
	}
	return modulus.slice(polyLength);
};

/**
 * augments ECC code words to given code words. the resulting words are
 * ready to be encoded in the matrix.
 *
 * the much of actual augmenting procedure follows JIS X 0510:2004 sec 8.7.
 * the code is simplified using the fact that the size of each code & ECC
 * blocks is almost same; for example, when we have 4 blocks and 46 data words
 * the number of code words in those blocks are 11, 11, 12, 12 respectively.
 * @returns {number[]}
 */
const augmentEccCode = function (/** @type {number[]} */ poly, /** @type {number} */ numBlocks, /** @type {number[]} */ genPoly) {
	const subSizes = [];
	const subSize = Math.trunc(poly.length / numBlocks);
	let currentSubSize = 0;
	const pivot = numBlocks - poly.length % numBlocks;
	for (let i = 0; i < pivot; ++i) {
		subSizes.push(currentSubSize);
		currentSubSize += subSize;
	}
	for (let i = pivot; i < numBlocks; ++i) {
		subSizes.push(currentSubSize);
		currentSubSize += subSize + 1;
	}
	subSizes.push(currentSubSize);

	const eccs = [];
	for (let i = 0; i < numBlocks; ++i) {
		eccs.push(calculateEccCode(poly.slice(subSizes[i], subSizes[i + 1]), genPoly));
	}

	const result = [];
	const nItemsPerBlock = Math.trunc(poly.length / numBlocks);
	for (let i = 0; i < nItemsPerBlock; ++i) {
		for (let j = 0; j < numBlocks; ++j) {
			result.push(poly[subSizes[j] + i]);
		}
	}
	for (let j = pivot; j < numBlocks; ++j) {
		result.push(poly[subSizes[j + 1] - 1]);
	}
	for (let i = 0; i < genPoly.length; ++i) {
		for (let j = 0; j < numBlocks; ++j) {
			result.push(eccs[j][i]);
		}
	}
	return result;
};

/**
 * augments BCH(p+q,q) code to the polynomial over GF(2), given the proper
 * genPoly. the both input and output are in binary numbers, and unlike
 * {@link calculateEccCode}, genPoly should include the 1 bit for the highest degree.
 *
 * actual polynomials used for this procedure are as follows:
 * - p=10, q=5, genPoly=x^10+x^8+x^5+x^4+x^2+x+1 (JIS X 0510:2004 Appendix C)
 * - p=18, q=6, genPoly=x^12+x^11+x^10+x^9+x^8+x^5+x^2+1 (ibid. Appendix D)
 * @returns {number}
 */
const augmentBchCode = function (/** @type {number} */ poly, /** @type {number} */ p, /** @type {number} */ genPoly, /** @type {number} */ q) {
	let modulus = poly << q;
	for (let i = p - 1; i >= 0; --i) {
		if ((modulus >> (q + i)) & 1) {
			modulus ^= genPoly << i;
		}
	}
	return (poly << q) | modulus;
};

/**
 * creates the base matrix for given version. it returns two matrices, one of
 * them is the actual one and the another represents the "reserved" portion
 * (e.g. finder and timing patterns) of the matrix.
 *
 * some entries in the matrix may be undefined, rather than 0 or 1. this is
 * intentional (no initialization needed!), and putData below will fill
 * the remaining ones.
 * @returns {{matrix: number[][], reserved: number[][]}}
 */
const makeBaseMatrix = function (/** @type {number} */ ver) {
	const v = /** @type {number[][]} */ (VERSIONS[ver]);
	console.assert(Array.isArray(v), 'unknown version');
	const n = getByteSizeForVersion(ver);
	/** @type {number[][]} */ const matrix = [];
	/** @type {number[][]} */ const reserved = [];
	for (let i = 0; i < n; ++i) {
		matrix.push([]);
		reserved.push([]);
	}

	const matrixCopy = function (/** @type {number} */ y, /** @type {number} */ x,
		/** @type {number} */ h, /** @type {number} */ w, /** @type {number[]} */ bits) {
		for (let i = 0; i < h; ++i) {
			for (let j = 0; j < w; ++j) {
				matrix[y + i][x + j] = (bits[i] >> j) & 1;
				reserved[y + i][x + j] = 1;
			}
		}
	};

	// finder patterns and a part of timing patterns
	// will also mark the format information area (not yet written) as reserved.
	matrixCopy(0, 0, 9, 9, [0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x17f, 0x00, 0x40]);
	matrixCopy(n - 8, 0, 8, 9, [0x100, 0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x7f]);
	matrixCopy(0, n - 8, 9, 8, [0xfe, 0x82, 0xba, 0xba, 0xba, 0x82, 0xfe, 0x00, 0x00]);

	// the rest of timing patterns
	for (let i = 9; i < n - 8; ++i) {
		matrix[6][i] = matrix[i][6] = ~i & 1;
		reserved[6][i] = reserved[i][6] = 1;
	}

	// alignment patterns
	const aligns = v[2];
	const m = aligns.length;
	for (let i = 0; i < m; ++i) {
		const min = (i == 0 || i == m - 1 ? 1 : 0);
		const max = (i == 0 ? m - 1 : m);
		for (let j = min; j < max; ++j) {
			matrixCopy(aligns[i], aligns[j], 5, 5, [0x1f, 0x11, 0x15, 0x11, 0x1f]);
		}
	}

	// version information
	if (needsVersionInfo(ver)) {
		const code = augmentBchCode(ver, 6, 0x1f25, 12);
		let k = 0;
		for (let i = 0; i < 6; ++i) {
			for (let j = 0; j < 3; ++j) {
				matrix[i][(n - 11) + j] = matrix[(n - 11) + j][i] = (code >> k++) & 1;
				reserved[i][(n - 11) + j] = reserved[(n - 11) + j][i] = 1;
			}
		}
	}

	return { matrix, reserved };
};

/**
 * fills the data portion (i.e. unmarked in reserved) of the matrix with given
 * code words. the size of code words should be no more than available bits,
 * and remaining bits are padded to 0 (cf. JIS X 0510:2004 sec 8.7.3).
 * @returns {number[][]} the same matrix, for convenience.
 */
const putData = function (/** @type {number[][]} */ matrix, /** @type {number[][]} */ reserved, /** @type {number[]} */ buf) {
	const n = matrix.length;
	let k = 0;
	let dir = -1;
	for (let i = n - 1; i >= 0; i -= 2) {
		if (i == 6) {
			--i;
		} // skip the entire timing pattern column
		let jj = (dir < 0 ? n - 1 : 0);
		for (let j = 0; j < n; ++j) {
			for (let ii = i; ii > i - 2; --ii) {
				if (!reserved[jj][ii]) {
					// may overflow, but (undefined >> x)
					// is 0 so it will auto-pad to zero.
					matrix[jj][ii] = (buf[k >> 3] >> (~k & 7)) & 1;
					++k;
				}
			}
			jj += dir;
		}
		dir = -dir;
	}
	return matrix;
};

/**
 * XOR-masks the data portion of the matrix. repeating the call with the same
 * arguments will revert the prior call (convenient in the matrix evaluation).
 * @returns {number[][]} the same matrix, for convenience.
 */
const maskData = function (/** @type {number[][]} */ matrix, /** @type {number[][]} */ reserved, /** @type {number} */ mask) {
	const maskMethod = MASKS[mask];
	const n = matrix.length;
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < n; ++j) {
			if (!reserved[i][j]) {
				matrix[i][j] ^= Number(maskMethod(i, j));
			}
		}
	}
	return matrix;
};

/**
 * puts the format information.
 * @returns {number[][]} the same matrix, for convenience.
 */
const putFormatInfo = function (/** @type {number[][]} */ matrix, /** @type {number[][]} */ _reserved, /** @type {EccLevel} */ ecclevel, /** @type {number} */ mask) {
	const n = matrix.length;
	const code = augmentBchCode((ecclevel << 3) | mask, 5, 0x537, 10) ^ 0x5412;
	for (let i = 0; i < 15; ++i) {
		const r = [0,1,2,3,4,5,7,8,n - 7,n - 6,n - 5,n - 4,n - 3,n - 2,n - 1][i];
		const c = [n - 1,n - 2,n - 3,n - 4,n - 5,n - 6,n - 7,n - 8,7,5,4,3,2,1,0][i];
		matrix[r][8] = matrix[8][c] = (code >> i) & 1;
		// we don't have to mark those bits reserved; always done
		// in makeBaseMatrix above.
	}
	return matrix;
};

/**
 * evaluates the resulting matrix and returns the score (lower is better).
 * (cf. JIS X 0510:2004 sec 8.8.2)
 *
 * the evaluation procedure tries to avoid the problematic patterns naturally
 * occurring from the original matrix. for example, it penalizes the patterns
 * which just look like the finder pattern which will confuse the decoder.
 * we choose the mask which results in the lowest score among 8 possible ones.
 *
 * note: zxing seems to use the same procedure and in many cases its choice
 * agrees to ours, but sometimes it does not. practically it doesn't matter.
 * @returns {number} returns the matrix score
 */
const evaluateMatrix = function (/** @type {number[][]} */ matrix) {
	// N1+(k-5) points for each consecutive row of k same-colored modules,
	// where k >= 5. no overlapping row counts.
	const PENALTY_CONSECUTIVE = 3;
	// N2 points for each 2x2 block of same-colored modules.
	// overlapping block does count.
	const PENALTY_TWO_BY_TWO = 3;
	// N3 points for each pattern with >4W:1B:1W:3B:1W:1B or
	// 1B:1W:3B:1W:1B:>4W, or their multiples (e.g. highly unlikely,
	// but 13W:3B:3W:9B:3W:3B counts).
	const PENALTY_FINDER_LIKE = 40;
	// N4*k points for every (5*k)% deviation from 50% black density.
	// i.e. k=1 for 55~60% and 40~45%, k=2 for 60~65% and 35~40%, etc.
	const PENALTY_DENSITY = 10;

	const evaluateGroup = function (/** @type {number[]} */ groups) { // assumes [W,B,W,B,W,...,B,W]
		let score = 0;
		for (let i = 0; i < groups.length; ++i) {
			if (groups[i] >= 5) {
				score += PENALTY_CONSECUTIVE + (groups[i] - 5);
			}
		}
		for (let i = 5; i < groups.length; i += 2) {
			const p = groups[i];
			if (groups[i - 1] == p && groups[i - 2] == 3 * p && groups[i - 3] == p &&
				groups[i - 4] == p && (groups[i - 5] >= 4 * p || groups[i + 1] >= 4 * p)) {
				// this part differs from zxing...
				score += PENALTY_FINDER_LIKE;
			}
		}
		return score;
	};

	const n = matrix.length;
	let score = 0;
	let numBlacks = 0;
	for (let i = 0; i < n; ++i) {
		const row = matrix[i];
		let groups;

		// evaluate the current row
		groups = [0]; // the first empty group of white
		for (let j = 0; j < n;) {
			let k;
			for (k = 0; j < n && row[j]; ++k) {
				++j;
			}
			groups.push(k);
			for (k = 0; j < n && !row[j]; ++k) {
				++j;
			}
			groups.push(k);
		}
		score += evaluateGroup(groups);

		// evaluate the current column
		groups = [0];
		for (let j = 0; j < n;) {
			let k;
			for (k = 0; j < n && matrix[j][i]; ++k) {
				++j;
			}
			groups.push(k);
			for (k = 0; j < n && !matrix[j][i]; ++k) {
				++j;
			}
			groups.push(k);
		}
		score += evaluateGroup(groups);

		// check the 2x2 box and calculate the density
		const nextRow = matrix[i + 1] || [];
		numBlacks += row[0];
		for (let j = 1; j < n; ++j) {
			const p = row[j];
			numBlacks += p;
			// at least comparison with next row should be strict...
			if (row[j - 1] == p && nextRow[j] === p && nextRow[j - 1] === p) {
				score += PENALTY_TWO_BY_TWO;
			}
		}
	}

	score += PENALTY_DENSITY * (Math.trunc(Math.abs(numBlacks / n / n - 0.5) / 0.05));
	return score;
};

/**
 * returns the fully encoded QR code matrix which contains given data.
 * it also chooses the best mask automatically when mask is -1.
 * @returns {number[][]} returns the QR code matrix
 */
const generate = function (/** @type {InputData} */ data, /** @type {number} */ ver,
	/** @type {Mode} */ mode, /** @type {EccLevel} */ ecclevel, /** @type {number} */ mask) {
	const v = /** @type {number[][]} */ (VERSIONS[ver]);
	console.assert(Array.isArray(v), 'unknown version');
	let buf = encode(ver, mode, data, numDataBits(ver, ecclevel) >> 3);
	buf = augmentEccCode(buf, v[1][ecclevel], GF256_GENERATED_POLY[v[0][ecclevel]]);

	const result = makeBaseMatrix(ver);
	const matrix = result.matrix;
	const reserved = result.reserved;
	putData(matrix, reserved, buf);

	if (mask < 0) {
		// find the best mask
		maskData(matrix, reserved, 0);
		putFormatInfo(matrix, reserved, ecclevel, 0);
		let bestMask = 0;
		let bestScore = evaluateMatrix(matrix);
		maskData(matrix, reserved, 0);
		for (mask = 1; mask < 8; ++mask) {
			maskData(matrix, reserved, mask);
			putFormatInfo(matrix, reserved, ecclevel, mask);
			const score = evaluateMatrix(matrix);
			if (bestScore > score) {
				bestScore = score;
				bestMask = mask;
			}
			maskData(matrix, reserved, mask);
		}
		mask = bestMask;
	}

	maskData(matrix, reserved, mask);
	putFormatInfo(matrix, reserved, ecclevel, mask);
	return matrix;
};

/**
 * QR code generator.
 * The options available are as follows:
 *
 * - version: an integer in [1,40]. when omitted (or -1) the smallest possible
 * version is chosen.
 * - mode: one of 'numeric', 'alphanumeric', 'octet'. when omitted the smallest
 * possible mode is chosen.
 * - ecclevel: one of 'L', 'M', 'Q', 'H'. defaults to 'L'.
 * - mask: an integer in [0,7]. when omitted (or -1) the best mask is chosen.
 *
 * for generate{HTML,PNG}:
 *
 * - modulesize: a number. this is a size of each modules in pixels, and
 * defaults to 5px.
 * - margin: a number. this is a size of margin in *modules*, and defaults to
 * 4 (white modules). the specification mandates the margin no less than 4
 * modules, so it is better not to alter this value unless you know what
 * you're doing.
 */
const QRCode = {
	/** @typedef {'numeric'|'alphanumeric'|'octet'} ModeParam */
	/** @typedef {'L'|'M'|'Q'|'H'} EccLevelParam */
	/**
	 * @typedef {Object} QRCodeOptions
	 * @property {number} [version] - Version in [1,40]; defaults to auto-select.
	 * @property {ModeParam} [mode] - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
	 * @property {EccLevelParam} [ecclevel] - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
	 * @property {number} [mask] - Mask in [0,7]; defaults to auto-select.
	 * @property {number} [modulesize] - Size of each module in pixels; defaults to 5px.
	 * @property {number} [margin] - Margin in modules; defaults to 4.
	 * @property {string} [unit] - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
	 * @property {number} [ratio] - Ratio for non-px sizes; defaults to 1.
	 */

	/**
	 * @typedef {Object} RenderOptions
	 * @property {number} moduleSize - Size of each module, in pixels.
	 * @property {number} margin - Margin around the code, in modules.
	 * @property {string} unit - Unit for non-px sizes (e.g., 'mm', 'cm').
	 * @property {number} ratio - Ratio for non-px sizes.
	 */

	/**
	 * resolves the drawing-related options to concrete values, filling in the
	 * library defaults for anything the caller omitted. shared by every
	 * rendering method so the defaults stay in one place.
	 * @returns {RenderOptions}
	 * @private
	 */
	_getRenderOptions(/** @type {QRCodeOptions} */ options = {}) {
		return {
			moduleSize: Math.max(options.modulesize || 5, 0.5),
			margin: Math.max(options.margin == null ? 4 : options.margin, 0),
			unit: options.unit || 'px',
			ratio: options.ratio || 1
		};
	},

	generate(/** @type {InputData} */ data, /** @type {QRCodeOptions} */ options = {}) {
		const MODES = {
			'numeric': Mode.NUMERIC,
			'alphanumeric': Mode.ALPHANUMERIC,
			'octet': Mode.OCTET
		};
		const ECC_LEVELS = {
			'L': EccLevel.L,
			'M': EccLevel.M,
			'Q': EccLevel.Q,
			'H': EccLevel.H
		};

		let ver = options.version || -1;
		const ecclevel = ECC_LEVELS[
			/** @type {EccLevelParam} */ ((options.ecclevel || 'L').toUpperCase())];
		let mode = options.mode
			? MODES[/** @type {ModeParam} */ (options.mode.toLowerCase())]
			: -1;
		const mask = 'mask' in options ? options.mask : -1;

		if (mode < 0) {
			if (typeof data === 'string') {
				if (NUMERIC_REGEXP.test(data)) {
					mode = Mode.NUMERIC;
				} else if (ALPHANUMERIC_OUT_REGEXP.test(data)) {
					// while encode supports case-insensitive
					// encoding, we restrict the data to be
					// uppercase when auto-selecting the mode.
					mode = Mode.ALPHANUMERIC;
				} else {
					mode = Mode.OCTET;
				}
			} else {
				mode = Mode.OCTET;
			}
		} else if (!(mode == Mode.NUMERIC || mode == Mode.ALPHANUMERIC ||
			mode == Mode.OCTET)) {
			throw new Error('invalid or unsupported mode');
		}

		const dataTmp = validateData(mode, data);
		if (dataTmp == null) {
			throw new Error('invalid data format');
		}
		data = dataTmp;

		if (ecclevel < 0 || ecclevel > 3) {
			throw new Error('invalid ECC level');
		}

		if (ver < 0) {
			for (ver = 1; ver <= 40; ++ver) {
				const len = getMaxDataLength(ver, mode, ecclevel);
				if (data.length <= len) {
					break;
				}
			}
			if (ver > 40) {
				throw new Error('too large data');
			}
		} else if (ver < 1 || ver > 40) {
			throw new Error('invalid version');
		}

		if (mask != -1 && (mask < 0 || mask > 8)) {
			throw new Error('invalid mask');
		}

		return generate(data, ver, mode, ecclevel, mask);
	},

	generateHTML(/** @type {InputData} */ data, /** @type {QRCodeOptions} */ options = {}) {
		const matrix = QRCode.generate(data, options);
		const { moduleSize, margin, unit, ratio } = QRCode._getRenderOptions(options);

		const e = document.createElement('div');
		const n = matrix.length;
		const html = ['<table border="0" cellspacing="0" cellpadding="0" style="border:' +
			moduleSize * margin + 'px solid #fff;background:#fff">'];
		for (let i = 0; i < n; ++i) {
			html.push('<tr>');
			for (let j = 0; j < n; ++j) {
				const size = unit === 'px'
					? 'width:' + moduleSize + 'px;height:' + moduleSize + 'px'
					: 'width:' + moduleSize * ratio + unit + '; height:' + moduleSize * ratio + unit;
				html.push('<td style="' + size +
					(matrix[i][j] ? ';background:#000' : '') + '" ' +
					'part="' + (matrix[i][j] ? 'module-fg' : 'module-bg') + '" ' + '></td>');
			}
			html.push('</tr>');
		}
		e.className = 'qrcode';
		e.innerHTML = html.join('') + '</table>';
		return e;
	},

	generateSVG(/** @type {InputData} */ data, /** @type {QRCodeOptions} */ options = {}) {
		const matrix = QRCode.generate(data, options);
		const n = matrix.length;
		const { moduleSize, margin } = QRCode._getRenderOptions(options);
		const size = moduleSize * (n + 2 * margin);

		const common = ' class= "fg"' + ' width="' + moduleSize + '" height="' + moduleSize + '"/>';

		const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		e.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
		e.setAttribute('style', 'shape-rendering:crispEdges');
		if (options.modulesize) {
			e.setAttribute('width', String(size));
			e.setAttribute('height', String(size));
		}

		const svg = [
			'<style scoped>.bg{fill:#FFF}.fg{fill:#000}</style>',
			'<rect class="bg" x="0" y="0"',
			'width="' + size + '" height="' + size + '"/>'
		];

		let yo = margin * moduleSize;
		for (let y = 0; y < n; ++y) {
			let xo = margin * moduleSize;
			for (let x = 0; x < n; ++x) {
				if (matrix[y][x]) {
					svg.push('<rect x="' + xo + '" y="' + yo + '"', common);
				}
				xo += moduleSize;
			}
			yo += moduleSize;
		}
		e.innerHTML = svg.join('');
		return e;
	},

	/**
	 * draws the QR code for given data into a caller-provided canvas. the
	 * canvas is resized to fit the code (including its margin) and painted in
	 * place; nothing else on the canvas is preserved.
	 * @returns {HTMLCanvasElement} the same canvas, for convenience.
	 */
	drawIntoCanvas(/** @type {HTMLCanvasElement} */ canvas,
		/** @type {InputData} */ data, /** @type {QRCodeOptions} */ options = {}) {
		const matrix = QRCode.generate(data, options);
		const { moduleSize, margin } = QRCode._getRenderOptions(options);
		const n = matrix.length;
		const size = moduleSize * (n + 2 * margin);

		canvas.width = canvas.height = size;
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('canvas support not found (also required for PNG support)');
		}

		context.fillStyle = '#fff';
		context.fillRect(0, 0, size, size);
		context.fillStyle = '#000';
		for (let i = 0; i < n; ++i) {
			for (let j = 0; j < n; ++j) {
				if (matrix[i][j]) {
					context.fillRect(moduleSize * (margin + j),
						moduleSize * (margin + i),
						moduleSize, moduleSize);
				}
			}
		}
		// context.fillText('evaluation: ' + evaluateMatrix(matrix), 10, 10);
		return canvas;
	},

	/**
	 * generates a new canvas element containing the QR code for given data.
	 * @returns {HTMLCanvasElement}
	 */
	generateCanvas: (/** @type {InputData} */ data, /** @type {QRCodeOptions} */ options = {}) =>
		QRCode.drawIntoCanvas(document.createElement('canvas'), data, options),

	generateDataURL: (/** @type {InputData} */ data,
		/** @type {QRCodeOptions} */ options = {},
		/** @type {Parameters<typeof HTMLCanvasElement.prototype.toDataURL>[0]} */ type) =>
		QRCode.generateCanvas(data, options).toDataURL(type),

	generatePNG: (/** @type {InputData} */ data, /** @type {QRCodeOptions} */ options = {}) =>
		QRCode.generateDataURL(data, options, 'image/png')
};

export default QRCode;
