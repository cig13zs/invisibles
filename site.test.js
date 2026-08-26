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
assert.strictEqual(manifest.version, '1.3.0');
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

assert.match(site, /swapped = r\.counts\.space \|\| 0/);
assert.match(site, /turned into a normal space/);
assert.doesNotMatch(site, /PlayStation trophy|typographic giveaways|AI watermark/i);

console.log('ok, Invisibles site and manifest checks passed');
