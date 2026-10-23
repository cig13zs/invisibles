// node core.test.js
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

// Visible typography (em dash, smart quotes) must not be flagged or stripped.
var visible = 'Normal text.\nTab\there. Em—dash and “quotes”.';
assert.strictEqual(I.scan(visible).total, 0, 'em dash / smart quotes are not hidden characters');
assert.strictEqual(I.clean(visible), visible, 'clean leaves visible text exactly alone');

// Opt-in punctuation normalize drops it to plain ASCII.
assert.strictEqual(I.normalizePunctuation('“a”—b…'), '"a"--b...');

// Emoji built with joiners, selectors or tag letters stay whole and are not flagged.
var emoji = [
  '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}',         // family
  '\u2764\uFE0F',                                    // red heart
  '\u2764\uFE0F\u200D\u{1F525}',                      // heart on fire
  '\u{1F469}\u{1F3FD}\u200D\u{1F4BB}',                // technologist, skin tone
  '\u{1F3F3}\uFE0F\u200D\u{1F308}',                   // rainbow flag
  '1\uFE0F\u20E3',                                   // keycap 1
  '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' // England flag
];
var emojiKept = [2, 1, 2, 1, 2, 1, 6];
emoji.forEach(function (e, i) {
  var line = 'Note ' + e + ' done';
  assert.strictEqual(I.scan(line).total, 0, 'emoji is not flagged: ' + e);
  assert.strictEqual(I.scan(line).emojiKept, emojiKept[i], 'emoji parts counted: ' + e);
  assert.strictEqual(I.clean(line), line, 'clean keeps the emoji: ' + e);
  assert.strictEqual(I.cleanWith(line, ['space']), line, 'cleanWith keeps the emoji: ' + e);
});

// The same characters outside an emoji are still caught, including data
// stacked on an emoji and tag letters that are not a flag.
var smuggled = [
  ['he\u200Dllo', 'hello'],                            // joiner between letters
  ['A\uFE0F', 'A'],                                    // selector on a letter
  ['\u{1F600}\uFE0F\uFE01', '\u{1F600}\uFE0F'],          // second selector stacked on an emoji
  ['\u{1F600}\u{E0100}\u{E0101}', '\u{1F600}'],          // supplementary selectors on an emoji
  ['\u{1F3F4}\u{E0068}\u{E0069}\u{E007F}', '\u{1F3F4}'], // tag letters spelling "hi"
  ['\u{1F600}\u200D', '\u{1F600}'],                     // joiner with nothing after it
  ['2\uFE0F', '2']                                     // keycap selector without the keycap
];
smuggled.forEach(function (pair) {
  assert.ok(I.scan(pair[0]).total > 0, 'still flagged: ' + JSON.stringify(pair[0]));
  assert.strictEqual(I.clean(pair[0]), pair[1], 'cleaned: ' + JSON.stringify(pair[0]));
});
assert.strictEqual(I.scan(null).emojiKept, 0);
assert.deepStrictEqual(I.emojiParts('plain'), {});

// Never throws on non-strings.
assert.strictEqual(I.scan(null).total, 0);
assert.strictEqual(I.clean(undefined), '');

// The extension ships its own copy of core.js. They drifted once already.
const fs = require('fs');
const path = require('path');
assert.strictEqual(
  fs.readFileSync(path.join(__dirname, 'core.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'extension', 'core.js'), 'utf8'),
  'extension/core.js is out of sync with core.js');

// The UI splits category labels on ": " to get the short name.
Object.values(I.CATEGORIES).forEach(function (label) {
  assert.ok(label.indexOf(': ') > 0, 'category label has no ": " separator: ' + label);
});

console.log('ok, all assertions passed');
