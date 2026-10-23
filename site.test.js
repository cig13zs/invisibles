const assert = require('assert');
const fs = require('fs');

const panel = fs.readFileSync('extension/sidepanel.html', 'utf8');
const site = fs.readFileSync('index.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));

assert.match(panel, /<html lang="en">/);
assert.match(panel, /<meta charset="utf-8">/);
assert.match(panel, /name="viewport"/);
assert.match(panel, /name="description"/);
assert.match(panel, /<script src="core\.js"><\/script>/);
assert.match(panel, /<script src="popup\.js"><\/script>/);
assert.match(panel, /pasted text stays in this panel and is never stored or uploaded/i);
assert.match(panel, /href="https:\/\/cig13zs\.github\.io\/invisibles\/privacy\.html"/);
assert.ok(!panel.includes('=\\'), 'side-panel attributes must not use escaped pseudo-quotes');
assert.ok(!panel.includes('\\>'), 'side-panel tags must close normally');

assert.deepStrictEqual(manifest.permissions, ['sidePanel']);
// The engine's VERSION follows the extension release, so a bump has to touch both.
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.strictEqual(require('./core.js').VERSION, manifest.version, 'core.js VERSION and manifest version differ');
assert.ok(!manifest.host_permissions, 'the extension must not request host access');
assert.strictEqual(manifest.side_panel.default_path, 'sidepanel.html');
for (const iconPath of new Set([
  ...Object.values(manifest.icons || {}),
  ...Object.values((manifest.action && manifest.action.default_icon) || {}),
])) {
  assert.ok(fs.existsSync('extension/' + iconPath), 'manifest icon is missing: ' + iconPath);
}
assert.strictEqual(manifest.background.service_worker, 'background.js');
assert.ok(fs.existsSync('extension/background.js'));
assert.ok(!fs.existsSync('extension/popup.html'), 'unused popup document should not ship');

// Decoded hidden text is untrusted, so both UIs write it with textContent.
const popupJs = fs.readFileSync('extension/popup.js', 'utf8');
assert.match(panel, /id="hidden-msg"/);
assert.match(site, /id="hidden-msg"/);
for (const src of [popupJs, site]) {
  assert.match(src, /I\.decodeHidden\(text\)/);
  assert.match(src, /q\.textContent=|q\.textContent = /);
}

assert.match(site, /swapped = r\.counts\.space \|\| 0/);
assert.match(site, /turned into a normal space/);
assert.doesNotMatch(site, /PlayStation trophy|typographic giveaways|AI watermark/i);

console.log('ok, Invisibles site and manifest checks passed');
