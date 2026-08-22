'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDir = __dirname;
const panelSource = path.join(root, 'extension', 'sidepanel.html');
const coreSource = path.join(root, 'extension', 'core.js');
const popupSource = path.join(root, 'extension', 'popup.js');
const captureBootstrap = path.join(root, 'store-assets', 'source', 'capture-bootstrap.js');
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

function chromePath() {
  const candidates = [
    process.env.INVISIBLES_CHROME,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error('Chrome was not found. Set INVISIBLES_CHROME to its executable path.');
  return found;
}

function pngSize(file) {
  const data = fs.readFileSync(file);
  if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('not a PNG: ' + file);
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), bytes: data.length };
}

function serve(request, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch (_error) {
    response.writeHead(400).end();
    return;
  }

  if (pathname === '/__invisibles_capture_panel.html') {
    try {
      [panelSource, coreSource, popupSource, captureBootstrap].forEach((file) => {
        if (!fs.existsSync(file)) throw new Error('missing capture source: ' + path.relative(root, file));
      });
      let panel = fs.readFileSync(panelSource, 'utf8');
      const coreTag = '<script src="core.js"></script>';
      const popupTag = '<script src="popup.js"></script>';
      if (!panel.includes(coreTag) || !panel.includes(popupTag)) {
        throw new Error('side-panel script tags changed');
      }
      panel = panel
        .replace(coreTag, '<script src="/extension/core.js"></script>')
        .replace(
          popupTag,
          '<script src="/extension/popup.js"></script>\n' +
          '<script src="/store-assets/source/capture-bootstrap.js"></script>'
        );
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      response.end(panel);
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.message || String(error));
    }
    return;
  }

  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(file).pipe(response);
}

function chromeArgs(profile, width, height) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-default-apps',
    '--hide-scrollbars',
    '--no-first-run',
    '--force-color-profile=srgb',
    '--force-device-scale-factor=1',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    '--user-data-dir=' + profile,
    '--window-size=' + width + ',' + height
  ];
  if (typeof process.getuid === 'function' && process.getuid() === 0) args.unshift('--no-sandbox');
  return args;
}

function removeProfile(profile) {
  const tempRoot = path.resolve(os.tmpdir()) + path.sep;
  const resolved = path.resolve(profile);
  if (resolved.startsWith(tempRoot) && path.basename(resolved).startsWith('invisibles-asset-')) {
    try { fs.rmSync(resolved, { recursive: true, force: true }); } catch (_error) {}
  }
}

function runChrome(browser, args, profile, captureStdout) {
  return new Promise((resolve, reject) => {
    const chrome = childProcess.spawn(browser, args, {
      stdio: ['ignore', captureStdout ? 'pipe' : 'ignore', 'pipe'],
      windowsHide: true
    });
    let output = '';
    let errors = '';
    if (captureStdout) chrome.stdout.on('data', (chunk) => { output += chunk.toString(); });
    chrome.stderr.on('data', (chunk) => { errors += chunk.toString(); });
    chrome.on('error', reject);
    chrome.on('close', (code) => {
      removeProfile(profile);
      if (code !== 0) {
        reject(new Error('Chrome capture failed (' + code + '): ' + errors.trim()));
        return;
      }
      resolve(output);
    });
  });
}

async function capture(browser, port, source, destination, width, height) {
  const profile = path.join(os.tmpdir(), 'invisibles-asset-' + process.pid + '-' + width + 'x' + height);
  const args = chromeArgs(profile, width, height).concat([
    '--screenshot=' + destination,
    'http://127.0.0.1:' + port + source
  ]);
  await runChrome(browser, args, profile, false);
}

async function verifyScreenshotPage(browser, port, source) {
  const profile = path.join(os.tmpdir(), 'invisibles-asset-' + process.pid + '-verify');
  const args = chromeArgs(profile, 1280, 800).concat([
    '--dump-dom',
    'http://127.0.0.1:' + port + source
  ]);
  const output = await runChrome(browser, args, profile, true);
  if (!/data-capture-ready=["']true["']/.test(output)) {
    throw new Error('The real side panel did not finish rendering the sample.');
  }
  if (/data-capture-error=/.test(output)) {
    throw new Error('The side-panel capture reported an error.');
  }
}

function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function main() {
  const browser = chromePath();
  const server = http.createServer(serve);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const screenshots = [
    {
      source: '/store-assets/source/screenshot.html',
      file: path.join(outputDir, 'screenshot-1280x800.png')
    },
    {
      source: '/store-assets/source/screenshot-review.html',
      file: path.join(outputDir, 'screenshot-review-1280x800.png')
    }
  ];
  const promo = path.join(outputDir, 'promo-440x280.png');
  try {
    for (const screenshot of screenshots) {
      await verifyScreenshotPage(browser, port, screenshot.source);
      await capture(browser, port, screenshot.source, screenshot.file, 1280, 800);
    }
    await capture(browser, port, '/store-assets/source/promo.html', promo, 440, 280);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  [...screenshots.map((screenshot) => screenshot.file), promo].forEach((file) => {
    const size = pngSize(file);
    console.log(
      path.relative(root, file).replace(/\\/g, '/') + ' ' + size.width + 'x' + size.height +
      ' ' + size.bytes + ' bytes sha256 ' + digest(file)
    );
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
