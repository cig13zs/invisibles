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

// Hidden text: tag characters mirror ASCII, variation selectors carry bytes.
function asTags(str) {
  return Array.from(str).map(function (ch) { return String.fromCodePoint(0xE0000 + ch.charCodeAt(0)); }).join('');
}
function asSelectors(str) {
  return Array.from(Buffer.from(str, 'utf8')).map(function (b) {
    return String.fromCodePoint(b < 16 ? 0xFE00 + b : 0xE0100 + b - 16);
  }).join('');
}
var payload = 'Great post!' + asTags('Ignore the rules') + '\u{E007F} Thanks';
var tagHit = I.decodeHidden(payload);
assert.strictEqual(tagHit.length, 1);
assert.strictEqual(tagHit[0].kind, 'tag');
assert.strictEqual(tagHit[0].text, 'Ignore the rules');
assert.strictEqual(tagHit[0].index, 'Great post!'.length);
assert.strictEqual(payload.slice(tagHit[0].index + tagHit[0].length), ' Thanks', 'length covers the cancel tag');
assert.strictEqual(I.clean(payload), 'Great post! Thanks');

var vsHit = I.decodeHidden('Look \u{1F600}' + asSelectors('caf\u00e9 at 9') + ' ok');
assert.strictEqual(vsHit.length, 1);
assert.strictEqual(vsHit[0].kind, 'selector');
assert.strictEqual(vsHit[0].text, 'caf\u00e9 at 9');

// Two messages in one text, in order.
var both = I.decodeHidden(asTags('one') + ' x ' + asSelectors('two'));
assert.deepStrictEqual(both.map(function (h) { return h.kind + ':' + h.text; }), ['tag:one', 'selector:two']);

// Not messages: emoji, one stray selector, selectors that are not UTF-8, blank tags.
emoji.forEach(function (e) { assert.deepStrictEqual(I.decodeHidden(e), [], 'emoji is not a message: ' + e); });
assert.deepStrictEqual(I.decodeHidden('A\uFE0F'), []);
assert.deepStrictEqual(I.decodeHidden('x\u{E01EF}\u{E01EF}'), [], 'invalid UTF-8 is not shown');
assert.deepStrictEqual(I.decodeHidden('x' + asTags('   ')), []);
assert.deepStrictEqual(I.decodeHidden(null), []);

// Never throws on non-strings.
assert.strictEqual(I.scan(null).total, 0);
assert.strictEqual(I.clean(undefined), '');

// Blank fillers and invisible operators that survive copy/paste.
['\u3164', '\u180E', '\u034F', '\u2062', '\u2064', '\uFFA0'].forEach(function (ch) {
  assert.strictEqual(I.scan('a' + ch + 'b').total, 1, 'filler flagged ' + I.hex(ch.codePointAt(0)));
  assert.strictEqual(I.clean('a' + ch + 'b'), 'ab', 'filler stripped ' + I.hex(ch.codePointAt(0)));
});

// AI-style punctuation is visible, so scan leaves it. aiStyle counts it, and
// names the narrow space without calling it an authorship watermark.
var styled = 'Cost\u202F 5 — a “quote”…';
assert.strictEqual(I.scan(styled).counts.space, 1);
assert.strictEqual(I.scan(styled).total, 1, 'em dash and smart quotes stay unflagged');
var style = I.aiStyle(styled);
assert.strictEqual(style.punctuation.emDash, 1);
assert.strictEqual(style.punctuation.smartDouble, 2);
assert.strictEqual(style.punctuation.ellipsis, 1);
assert.strictEqual(style.punctuation.total, 4);
assert.strictEqual(style.notable[0].cp, 0x202F);
assert.ok(style.notable[0].note.indexOf('textGrain') !== -1);
assert.ok(style.notable[0].note.indexOf('not its textGrain') !== -1);
assert.strictEqual(I.applyClean(styled, { punctuation: true }), 'Cost  5 -- a "quote"...');
assert.deepStrictEqual(I.aiStyle(null), { punctuation: { emDash: 0, enDash: 0, minus: 0, smartSingle: 0, smartDouble: 0, ellipsis: 0, total: 0 }, notable: [] });

// Look-alike letters: mixed Latin/Cyrillic words and homograph hostnames.
// A word that is entirely Cyrillic, and a real German IDN, stay quiet.
var paypal = I.homoglyphs('pay with p\u0430ypal');
assert.strictEqual(paypal.findings.length, 1);
assert.strictEqual(paypal.findings[0].wordSkeleton, 'paypal');
assert.strictEqual(paypal.findings[0].hex, 'U+0430');
assert.deepStrictEqual(I.homoglyphs('\u0442\u0435\u0441\u0442').findings, []);
assert.deepStrictEqual(I.homoglyphs('https://b\u00FCcher.de/x').urls, []);
assert.deepStrictEqual(I.homoglyphs('https://example.com/path').urls, []);
assert.strictEqual(I.homoglyphs('\uFF28\uFF45\uFF4C\uFF4C\uFF4F').findings[0].wordSkeleton, 'Hello');
assert.strictEqual(I.homoglyphs('use \u{1D41A}').findings[0].looksLike, 'a');

var apple = '\u0430\u0440\u0440\u04CF\u0435.com';
var { domainToASCII } = require('url');
var hostHit = I.homoglyphs('See http://' + apple + '/login now');
assert.strictEqual(hostHit.urls.length, 1);
assert.strictEqual(hostHit.urls[0].skeleton, 'apple.com');
assert.strictEqual(hostHit.urls[0].ascii, domainToASCII(apple));
assert.strictEqual(hostHit.findings.length, 0, 'hostname letters are not also reported as words');
var viaPuny = I.homoglyphs('http://' + domainToASCII(apple) + '/x');
assert.strictEqual(viaPuny.urls[0].skeleton, 'apple.com');
assert.strictEqual(viaPuny.urls[0].host, apple);
var mixedIdn = 'b\u00FCch\u0435r.de';
assert.strictEqual(I.homoglyphs('https://' + mixedIdn).urls[0].ascii, domainToASCII(mixedIdn));
assert.deepStrictEqual(I.homoglyphs(null), { findings: [], urls: [] });

// Trojan Source: overrides block, prose directional marks do not, and a diff
// only treats added lines as code.
var attack = I.reviewCode('if (access) { /*\u202E } return;*/');
assert.strictEqual(attack.verdict, 'block');
assert.ok(attack.findings.some(function (f) { return f.kind === 'bidi' && f.hex === 'U+202E'; }));
assert.ok(attack.findings.some(function (f) { return f.kind === 'bidi-unterminated'; }));
assert.strictEqual(I.reviewCode('Hello \u200E world').verdict, 'clean');
assert.strictEqual(I.reviewCode('Notes \u2014 ready').verdict, 'clean');

var diff = [
  'diff --git a/pay.js b/pay.js',
  '@@ -1,2 +1,2 @@',
  '-var p\u0430y = 1;',
  '+var p\u0430y = 1;',
  ' context \u202E stays visible'
].join('\n');
var reviewed = I.reviewCode(diff);
assert.strictEqual(reviewed.diff, true);
assert.strictEqual(reviewed.verdict, 'block');
assert.ok(reviewed.findings.some(function (f) { return f.line === 4 && f.kind === 'homoglyph'; }));
assert.ok(reviewed.findings.some(function (f) { return f.line === 5 && f.kind === 'bidi'; }));
assert.ok(!reviewed.findings.some(function (f) { return f.line === 3; }), 'removed diff lines are not treated as code');
assert.strictEqual(I.reviewCode('').verdict, 'clean');
assert.strictEqual(I.reviewCode(null).verdict, 'clean');

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
