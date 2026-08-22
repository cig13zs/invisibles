'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function checkPng(relative, width, height) {
  const file = path.join(__dirname, relative);
  assert.ok(fs.existsSync(file), 'missing store asset: ' + relative);
  const data = fs.readFileSync(file);
  assert.strictEqual(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', relative + ' is not PNG');
  assert.strictEqual(data.readUInt32BE(16), width, relative + ' width');
  assert.strictEqual(data.readUInt32BE(20), height, relative + ' height');
  assert.ok(data.length > 10000, relative + ' is unexpectedly small');
  assert.ok(data.length < 5 * 1024 * 1024, relative + ' exceeds 5 MB');
  return crypto.createHash('sha256').update(data).digest('hex');
}

const screenshotHash = checkPng('store-assets/screenshot-1280x800.png', 1280, 800);
const promoHash = checkPng('store-assets/promo-440x280.png', 440, 280);
assert.notStrictEqual(screenshotHash, promoHash);

const capture = fs.readFileSync(path.join(__dirname, 'store-assets', 'capture.js'), 'utf8');
const bootstrap = fs.readFileSync(
  path.join(__dirname, 'store-assets', 'source', 'capture-bootstrap.js'),
  'utf8'
);
assert.match(capture, /path\.join\(root, 'extension', 'sidepanel\.html'\)/);
assert.match(capture, /path\.join\(root, 'extension', 'core\.js'\)/);
assert.match(capture, /path\.join\(root, 'extension', 'popup\.js'\)/);
assert.ok(capture.includes('data-capture-ready'));
assert.ok(bootstrap.includes("document.getElementById('in')"));
assert.ok(bootstrap.includes("document.getElementById('clean')"));

const listing = fs.readFileSync(path.join(__dirname, 'store-assets', 'listing.txt'), 'utf8');
assert.match(listing, /no host access/i);
assert.match(listing, /not collected or transmitted/i);
assert.match(listing, /identifies characters, not authorship or intent/i);
assert.doesNotMatch(listing, /detects ai writing|guaranteed|100% safe/i);

const promoSource = fs.readFileSync(path.join(__dirname, 'store-assets', 'source', 'promo.html'), 'utf8');
assert.ok(promoSource.includes('Clean copy: notes ready now'));
assert.ok(!promoSource.includes('readynow'));

console.log('store assets ok');
console.log('screenshot sha256 ' + screenshotHash);
console.log('promo sha256 ' + promoHash);
