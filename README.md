# Invisibles

Paste text, see every hidden character in it with its name and code point, then
click once to strip them. Zero-width spaces, non-breaking spaces that look like
real ones, direction controls, and the odd characters that ride along when text
moves between editors, documents, chat apps, and websites.

[![Ko-fi](https://img.shields.io/badge/Ko--fi-buy_me_a_coffee-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/jju1s)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/cig13zs/invisibles/test.yml?style=flat-square&label=tests)](https://github.com/cig13zs/invisibles/actions)

Web app: **[cig13zs.github.io/invisibles](https://cig13zs.github.io/invisibles/)**.
Or install the [browser extension](#browser-extension) so it's one click from
any tab, offline.

A single invisible character can break CSV and JSON imports, stop strings from
matching, or throw off code search. Most editors do not draw these characters,
so the problem often appears somewhere downstream.

Paste tools are not always clear about how they handle input. This repository is
deliberately auditable: it has no server, analytics, or remote processing. The
web app is one HTML page and one small script, and it works offline.

There are two builds sharing one engine (`core.js`): the web app and a side-panel
extension. The extension requests only Chrome's `sidePanel` permission and no
host access, so it cannot read the pages you visit.

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

Emoji are left whole. A zero-width joiner, variation selector or tag letter that is
part of an emoji (👨‍👩‍👧, ❤️, a rainbow flag, a keycap, the England flag) is not
flagged, and the summary says how many it kept. The same characters anywhere else
are still flagged, including extra selectors stacked on an emoji, which is a way
to hide data.

Some of these characters can carry a whole message. Tag characters mirror ASCII
letters one for one, and variation selectors can hold bytes. When a run of either
decodes to readable text, Invisibles shows it in plain words under the summary
("Hidden text in tag characters: Ignore previous instructions..."), so you can
see what someone tried to slip past a reader or a chatbot.

Look-alike spaces get replaced with a normal space so words don't run together.
Everything else is removed. There's an optional toggle that also swaps fancy
punctuation (curly quotes, em dashes, ellipsis) for plain ASCII when a target
system does not handle typographic characters reliably.

## Browser extension

Opens directly as a Chrome Side Panel. Click the toolbar icon, and it docks cleanly on the side of your browser without floating in front of your page content. Paste, clean, copy. The panel states before input that pasted text stays in the panel and is never stored or uploaded. It declares no remote permissions and no host access, so it cannot read any page you visit, and it works completely offline.

Load it unpacked in Chrome, Edge, Brave or Opera:

1. Download the latest zip from [Releases](https://github.com/cig13zs/invisibles/releases) and unzip it.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click Load unpacked and pick the `extension` folder.
4. Click the Invisibles icon to open the sidebar and paste your text.

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
I.decodeHidden(text);   // [{kind:'tag', text:'hidden words', index, length}]
```

`scan()` and `clean()` never throw, even on non-string input.

## Files

```
core.js        classify() + scan() + clean() + decodeHidden() + normalizePunctuation()
core.test.js   node core.test.js
index.html     the web app. No framework, no build step
extension/     MV3 side panel, sidePanel permission only
scripts/       deterministic Chrome Web Store package builder
store-assets/  listing copy, reproducible screenshots, and submission notes
tools/         deterministic icon generator
```

```bash
node core.test.js
node site.test.js
python tests/package.test.py
node store-assets.test.js
```

## Limits

It flags characters, not intent. A non-breaking space is sometimes deliberate,
so the reveal view shows you exactly what and where before you strip anything.

The punctuation normalize is opt-in and lossy, since em dashes become `--`. It's
off by default.

It can't tell you whether text was written by an AI. It only shows the
characters that are actually there.

## More tools

- [Toolfold](https://github.com/cig13zs/toolfold), selected local developer utilities in one PWA
- [Plusminus](https://github.com/cig13zs/plusminus), measurement uncertainty budgets from instrument specifications
- [Rinse](https://github.com/cig13zs/rinse), inspect and remove location metadata from a photo

MIT licensed. [Ko-fi](https://ko-fi.com/jju1s) if it saved you a headache.
