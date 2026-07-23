# Invisibles

Text can carry characters you can't see — zero-width spaces, look-alike spaces, direction-flipping
controls, AI watermark characters. **Invisibles** reveals them and strips them, entirely in your
browser.

[![Ko-fi](https://img.shields.io/badge/Ko--fi-buy_me_a_coffee-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/jju1s)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/cig13zs/invisibles/test.yml?style=flat-square&label=tests)](https://github.com/cig13zs/invisibles/actions)

**[cig13zs.github.io/invisibles](https://cig13zs.github.io/invisibles/)**

Paste any text, see every hidden character highlighted with its name and code point, then click once
to remove them. A single invisible character kept a PlayStation trophy unobtainable for ten years,
corrupts CSV/JSON imports, breaks password and code search, and slips into text pasted out of AI
tools. This finds them.

## Nothing is uploaded

Almost every "remove invisible characters" or "AI text cleaner" tool online is a **web service** —
you paste your text and it goes to their server. This one has no server. It's one HTML page and one
small script (`core.js`). It works offline, makes zero network requests, and stays free.

## What it catches

| Category | Examples | Why it matters |
|---|---|---|
| Zero-width | ZWSP `U+200B`, ZWJ `U+200D`, word joiner, BOM `U+FEFF` | Invisible; break search, passwords, code |
| Look-alike spaces | NBSP `U+00A0`, narrow NBSP `U+202F`, ideographic space | Look like a space, aren't one |
| Bidi controls | RLO `U+202E`, isolates `U+2066`–`U+2069` | Can reorder/hide text (Trojan Source) |
| Soft hyphen | `U+00AD` | Invisible unless the line wraps |
| Tag characters | `U+E0000`–`U+E007F` | Invisible; smuggle hidden text / prompts |
| Variation selectors | `U+FE00`–`U+FE0F` | Invisible; can carry hidden data |
| Control chars | C0/C1, line/paragraph separators | Non-printing; break parsers |

Look-alike spaces are replaced with a normal space (so words don't run together); everything else is
removed. An **opt-in** toggle also normalizes "fancy" punctuation — smart quotes, em/en dashes,
ellipsis — into plain ASCII, for people scrubbing the typographic tells out of AI text.

## Use it as a library

`core.js` is dependency-free and works in the browser (`window.Invisibles`) or Node (`require`).

```js
const I = require('./core.js');

I.scan('he​llo').total;      // 1
I.scan('he​llo').findings;   // [{index:2, cp:8203, hex:'U+200B', name:'Zero-Width Space', category:'zero-width'}]
I.clean('he​llo');           // 'hello'
I.clean('a b');              // 'a b'  (NBSP -> normal space)
I.normalizePunctuation('“a”—b');  // '"a"--b'  (opt-in)
```

`scan()` and `clean()` never throw, even on non-string input.

## How it's built

```
core.js        classify() + scan() + clean() + normalizePunctuation() — browser + Node
core.test.js   node core.test.js
index.html     the page: paste, reveal, clean, copy — no framework, no build step
```

```bash
node core.test.js
```

## Limits

- **It flags characters, not intent.** A non-breaking space is sometimes there on purpose. The reveal
  view shows you exactly what and where before you strip anything.
- **Punctuation normalization is opt-in and lossy** — em dashes become `--`. Off by default.
- Removing watermark characters from AI text is trivial and this does it, but it can't tell you
  whether text was AI-written; it only shows the characters that are there.

MIT licensed. Do what you like with it.
