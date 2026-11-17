// node extension.test.js — manifest security and UI controller checks
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
const popupJs = fs.readFileSync('extension/popup.js', 'utf8');
const panel = fs.readFileSync('extension/sidepanel.html', 'utf8');

assert.strictEqual(manifest.manifest_version, 3);
assert.deepStrictEqual(manifest.permissions, ['sidePanel', 'storage']);
assert.ok(!manifest.host_permissions, 'host_permissions must stay absent');

const csp = manifest.content_security_policy && manifest.content_security_policy.extension_pages;
assert.ok(csp, 'extension_pages CSP must be set explicitly');
assert.match(csp, /script-src 'self'/);
assert.match(csp, /object-src 'none'/);
assert.doesNotMatch(csp, /'unsafe-eval'/);
assert.doesNotMatch(csp, /https?:/);

assert.doesNotMatch(popupJs, /summary\.innerHTML/, 'summary must not use innerHTML');
assert.doesNotMatch(popupJs, /chips\.innerHTML/, 'chips must not use innerHTML');
assert.match(popupJs, /function esc\(/);
assert.match(popupJs, /chrome\.storage\.sync/);
assert.match(popupJs, /reader\.onerror/);
assert.match(popupJs, /REVEAL_LIMIT/);

assert.match(panel, /id="firstrun"/);
assert.match(panel, /role="group"/);
assert.match(panel, /id="drop"[^>]*role="button"/);
assert.match(panel, /aria-keyshortcuts/);

assert.strictEqual(manifest.version, require('./core.js').VERSION);

console.log('ok, extension security and UI checks passed');