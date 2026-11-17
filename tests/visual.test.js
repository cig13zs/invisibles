// Confirms the committed visual-regression screenshots are real PNGs.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const shots = [
  'docs/screenshots/before-design-scan.png',
  'docs/screenshots/before-design-clean.png',
  'docs/screenshots/sidepanel-empty.png',
  'docs/screenshots/sidepanel-with-hidden.png',
  'docs/screenshots/sidepanel-after-clean.png',
  'docs/screenshots/sidepanel-dark.png'
];

for (const relative of shots) {
  const data = fs.readFileSync(path.join(__dirname, '..', relative));
  assert.strictEqual(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', relative);
  assert.ok(data.length > 8000, relative + ' looks empty');
}

console.log('ok, visual regression screenshots present');