# Invisibles

Paste text, see every hidden character in it with its name and code point, then
click once to strip them. Zero-width spaces, non-breaking spaces that look like
real ones, direction controls, the odd characters that ride along in text copied
out of an AI.

[![Ko-fi](https://img.shields.io/badge/Ko--fi-buy_me_a_coffee-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/jju1s)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/cig13zs/invisibles/test.yml?style=flat-square&label=tests)](https://github.com/cig13zs/invisibles/actions)

Web app: **[cig13zs.github.io/invisibles](https://cig13zs.github.io/invisibles/)**.
Or install the [browser extension](#browser-extension) so it's one click from
any tab, offline.

One invisible character kept a PlayStation trophy stuck for ten years. The same
thing breaks CSV and JSON imports, stops passwords matching, throws off code
search, and hides in text pasted out of ChatGPT. Most editors never draw these
characters, so you find out after something breaks.

Almost every other tool for this is a website you paste into, which means your
text goes to their server first. This one has no server. It's one HTML page and
one small script, and it works offline.

There are two builds sharing one engine (`core.js`): the web app, and a popup
extension that declares no permissions.

## What it looks for

| Category | Examples | Why it matters |
|---|---|---|
| Zero-width | ZWSP `U+200B`, ZWJ `U+200D`, word joiner, BOM `U+FEFF` | Invisible; break search, passwords, code |
| Look-alike spaces | NBSP `U+00A0`, narrow NBSP `U+202F`, ideographic space | Look like a space, aren't one |
| Bidi controls | RLO `U+202E`, isolates `U+2066`..`U+2069` | Can reorder or hide text (Trojan Source) |
| Soft hyphen | `U+00AD` | Invisible unless the line wraps |
| Tag characters | `U+E0000`..`U+E007F` | Invisible; smuggle hidden text or prompts |
| Variation selectors | `U+FE00`..`U+FE0F` | Invisible; can carry hidden data |
| Control chars | C0/C1, line and paragraph separators | Non-printing; break parsers |

Look-alike spaces get replaced with a normal space so words don't run together.
Everything else is removed. There's an optional toggle that also swaps fancy
punctuation (curly quotes, em dashes, ellipsis) for plain ASCII, for scrubbing
typographic giveaways out of AI text.

## Browser extension

Popup only. Click the toolbar icon, paste, clean, copy. It declares no
permissions and no host access, so it can't read any page you visit, and it
works with no connection.

Not on the Chrome Web Store yet, so load it unpacked in Chrome, Edge, Brave or
Opera:

1. Download the latest zip from [Releases](https://github.com/cig13zs/invisibles/releases) and unzip it.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click Load unpacked and pick the `extension` folder.
4. Click the Invisibles icon and paste your text.

## Use it as a library

`core.js` has no dependencies and runs in the browser (`window.Invisibles`) or
in Node (`require`).

```js
const I = require('./core.js');

I.scan('he​llo').total;      // 1
I.scan('he​llo').findings;   // [{index:2, cp:8203, hex:'U+200B', name:'Zero-Width Space', category:'zero-width'}]
I.clean('he​llo');           // 'hello'
I.clean('a b');              // 'a b'  (NBSP becomes a normal space)
I.normalizePunctuation('“a”—b');  // '"a"--b'  (opt-in)
```

`scan()` and `clean()` never throw, even on non-string input.

## Files

```
core.js        classify() + scan() + clean() + normalizePunctuation()
core.test.js   node core.test.js
index.html     the web app. No framework, no build step
extension/     MV3 popup, no permissions
```

```bash
node core.test.js
```

## Limits

It flags characters, not intent. A non-breaking space is sometimes deliberate,
so the reveal view shows you exactly what and where before you strip anything.

The punctuation normalize is opt-in and lossy, since em dashes become `--`. It's
off by default.

It can't tell you whether text was written by an AI. It only shows the
characters that are actually there.

## More tools

- [Carryover](https://github.com/cig13zs/carryover), AI chat context transfer for ChatGPT, DeepSeek and Grok
- [Rinse](https://github.com/cig13zs/rinse), see the GPS in a photo and wash it off
- [Return Google Cache](https://github.com/cig13zs/return-google-cache), put the Cached link back on Google results
- [Return 100 Results](https://github.com/cig13zs/return-100-results), browse ~100 Google results as one page

MIT licensed. [Ko-fi](https://ko-fi.com/jju1s) if it saved you a headache.
