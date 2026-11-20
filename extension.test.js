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
assert.match(panel, /theme\.css/);
assert.match(panel, /id="empty"/);
assert.match(fs.readFileSync('extension/theme.css', 'utf8'), /prefers-reduced-motion/);
assert.match(fs.readFileSync('extension/theme.css', 'utf8'), /--font-mono/);

assert.strictEqual(manifest.version, require('./core.js').VERSION);
assert.ok(manifest.name.length <= 75, 'store name is over 75 characters');
assert.ok(manifest.description.length <= 132, 'manifest description is over 132 characters');
assert.ok(!manifest.host_permissions && !manifest.content_scripts && !manifest.optional_permissions,
  'host access must stay absent');
assert.strictEqual(manifest.commands._execute_action.suggested_key.default, 'Ctrl+Shift+Period');
assert.match(popupJs, /normalizePunct/);
assert.match(popupJs, /hintDismissed/);
assert.match(popupJs, /cleanOnPaste/);
assert.match(popupJs, /cleanOnCopy/);
assert.match(popupJs, /removedTotal/);
assert.match(popupJs, /I\.applyClean\(/);
assert.match(popupJs, /I\.homoglyphs\(/);
assert.match(popupJs, /I\.reviewCode\(/);
assert.match(popupJs, /I\.aiStyle\(/);
assert.doesNotMatch(popupJs, /clipboardRead|host_permissions|content_scripts/);
assert.match(panel, /id="ai-clean"/);
assert.match(panel, /id="paste"/);
assert.match(panel, /id="lookalikes"/);
assert.match(panel, /id="review"/);

console.log('ok, extension security and UI checks passed');