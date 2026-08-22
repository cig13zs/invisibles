const assert = require('assert');
const fs = require('fs');

const panel = fs.readFileSync('extension/sidepanel.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));

assert.match(panel, /<html lang="en">/);
assert.match(panel, /<meta charset="utf-8">/);
assert.match(panel, /name="viewport"/);
assert.match(panel, /name="description"/);
assert.match(panel, /<script src="core\.js"><\/script>/);
assert.match(panel, /<script src="popup\.js"><\/script>/);
assert.ok(!panel.includes('=\\'), 'side-panel attributes must not use escaped pseudo-quotes');
assert.ok(!panel.includes('\\>'), 'side-panel tags must close normally');

assert.deepStrictEqual(manifest.permissions, ['sidePanel']);
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

console.log('ok, Invisibles site and manifest checks passed');
