// node core.test.js  — no framework, asserts the parser reads and cleans a real nasty string.
var assert = require('assert');
var I = require('./core.js');

var ZWSP = '​', NBSP = ' ', RLO = '‮', SOFT = '­';
var TAG = String.fromCodePoint(0xE0041); // an invisible "tag" letter (steganography)
var VS = '️';                        // variation selector

var sample = 'he' + ZWSP + 'llo' + NBSP + 'wor' + SOFT + 'ld' + RLO + 'x' + TAG + VS;

var r = I.scan(sample);
assert.strictEqual(r.total, 6, 'finds all six hidden chars');
assert.strictEqual(r.counts['zero-width'], 1);
assert.strictEqual(r.counts['space'], 1);
assert.strictEqual(r.counts['soft-hyphen'], 1);
assert.strictEqual(r.counts['bidi'], 1);
assert.strictEqual(r.counts['tag-char'], 1);
assert.strictEqual(r.counts['variation-selector'], 1);

var cleaned = I.clean(sample);
assert.strictEqual(cleaned, 'hello worldx', 'strips invisibles, NBSP becomes a real space');
assert.strictEqual(I.scan(cleaned).total, 0, 'cleaned text has nothing left to flag');

// Visible typography (em dash, smart quotes) is NOT invisible — must not be flagged or stripped.
var visible = 'Normal text.\nTab\there. Em—dash and “quotes”.';
assert.strictEqual(I.scan(visible).total, 0, 'em dash / smart quotes are not hidden characters');
assert.strictEqual(I.clean(visible), visible, 'clean leaves visible text exactly alone');

// Opt-in punctuation normalize turns the AI "tells" into plain ASCII.
assert.strictEqual(I.normalizePunctuation('“a”—b…'), '"a"--b...');

// Never throws on non-strings.
assert.strictEqual(I.scan(null).total, 0);
assert.strictEqual(I.clean(undefined), '');

console.log('ok — all assertions passed');
