// Smoke-test the side panel UI (same HTML/JS as the MV3 build) over HTTP with mocked chrome APIs.
// Full chrome-extension:// loading is environment-dependent; manifest and CSP are covered by extension.test.js.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(__dirname, '../extension');
const artifacts = process.env.E2E_ARTIFACTS_DIR || path.resolve(__dirname, '../docs/screenshots');

fs.mkdirSync(artifacts, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'sidepanel.html';
  const file = path.normalize(path.join(extensionDir, rel));
  if (!file.startsWith(extensionDir)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  const store = { hintDismissed: true, removedTotal: 0 };
  globalThis.__badge = '';
  globalThis.chrome = {
    storage: {
      sync: {
        get(keys, cb) {
          const out = {};
          Object.keys(keys || {}).forEach((key) => {
            out[key] = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : keys[key];
          });
          cb(out);
        },
        set(obj, cb) {
          Object.assign(store, obj);
          if (cb) cb();
        },
      },
      local: {
        get(keys, cb) {
          const out = {};
          Object.keys(keys || {}).forEach((key) => {
            out[key] = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : keys[key];
          });
          cb(out);
        },
        set(obj, cb) {
          Object.assign(store, obj);
          if (cb) cb();
        },
      },
    },
    action: {
      setBadgeText(details) {
        globalThis.__badge = details && details.text ? details.text : '';
      },
      setBadgeBackgroundColor() {},
    },
    runtime: {
      getManifest() {
        return { version: '2.0.0' };
      },
    },
  };
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.setViewportSize({ width: 420, height: 820 });
await page.emulateMedia({ colorScheme: 'light' });
await page.goto(`http://127.0.0.1:${port}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#in');
await page.screenshot({ path: path.join(artifacts, 'sidepanel-empty.png'), fullPage: true });

const ZWSP = '\u200B';
await page.fill('#in', `he${ZWSP}llo`);
await page.waitForSelector('.verdict.dirty');
const badge = await page.evaluate(() => globalThis.__badge);
if (badge !== '1') {
  console.error('Expected toolbar badge 1, got', JSON.stringify(badge));
  process.exitCode = 1;
}
if ((await page.locator('#preview mark.mark').count()) < 1) {
  console.error('Expected preview mark for zero-width space');
  process.exitCode = 1;
} else {
  await page.screenshot({ path: path.join(artifacts, 'sidepanel-with-hidden.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: path.join(artifacts, 'sidepanel-dark.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.click('#clean');
  await page.waitForSelector('#out:not([hidden])');
  const out = await page.inputValue('#out');
  if (out !== 'hello') {
    console.error('Clean output mismatch:', JSON.stringify(out));
    process.exitCode = 1;
  } else {
    await page.screenshot({ path: path.join(artifacts, 'sidepanel-after-clean.png'), fullPage: true });
    await page.fill('#in', 'pay p\u0430ypal');
    await page.waitForSelector('#lookalikes:not([hidden])');
    const warning = await page.locator('#lookalikes').innerText();
    if (!warning.includes('paypal')) {
      console.error('Look-alike warning missing:', warning);
      process.exitCode = 1;
    } else {
      await page.screenshot({ path: path.join(artifacts, 'sidepanel-lookalike.png'), fullPage: true });
    }
    await page.locator('label.opt', { has: page.locator('#paste') }).click();
    await page.locator('#in').focus();
    const pasted = await page.evaluate((zwsp) => {
      const el = document.getElementById('in');
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      const dt = new DataTransfer();
      dt.setData('text/plain', 'he' + zwsp + 'llo');
      const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
      el.dispatchEvent(ev);
      return el.value.endsWith('hello');
    }, ZWSP);
    if (!pasted) {
      console.error('Clean-on-paste did not strip the zero-width space');
      process.exitCode = 1;
    }
    if (errors.length) {
      console.error('Console errors:', errors);
      process.exitCode = 1;
    } else if (!process.exitCode) {
      console.log('ok, extension UI e2e smoke passed');
      console.log('ARTIFACTS=' + artifacts);
    }
  }
}

await browser.close();
server.close();
process.exit(process.exitCode || 0);