# Changelog

## 2.0.0 (2026-11-20)

- Store name is now **Invisibles: Find & Remove Hidden Characters (AI text cleaner)**. The short description names look-alike letters and bidi tricks and still says the tool is local, with no host access. See [STORE_LISTING.md](STORE_LISTING.md).
- AI paste. Em dashes, smart quotes, and ellipsis are counted as visible punctuation, not as hidden characters and not as proof of authorship. **Clean AI paste** strips hidden characters and turns that punctuation into plain ASCII. U+202F and a few other characters people meet in chatbot replies get a plain-language note. That note says the narrow no-break space reported in some 2025 ChatGPT replies is not OpenAI’s textGrain watermark.
- Look-alike letters. A Latin word that mixes in a Cyrillic or Greek look-alike is flagged, as are fullwidth and mathematical Latin letters. A hostname that uses those letters is shown with the name it resembles and its DNS form (`xn--…`). Entirely Cyrillic or Greek words, and ordinary IDNs such as `bücher.de`, are not flagged. Letters are not rewritten.
- Code review for pasted text. Bidirectional overrides and isolates are flagged on any line (Trojan Source), including a context line of a diff. Invisible characters and look-alike letters are flagged on lines that look like code, and on added lines of a unified diff. Removed diff lines are not treated as the change. Directional marks in ordinary prose stay quiet.
- More blank characters are now hidden-character findings: Hangul filler (U+3164), halfwidth Hangul filler, Mongolian vowel separator, combining grapheme joiner, and the invisible math and deprecated format characters in U+2061–U+2064 and U+206A–U+206F.
- Clean on paste and clean on copy, inside the side panel. Both default to off, so an existing install keeps today’s paste and copy behavior. No clipboard permission: the panel already receives the paste and copy events.
- Toolbar badge shows the current hidden-character count. A `removedTotal` count in `chrome.storage.local` records how many hidden characters this browser has cleaned. The text is not stored.
- Suggested shortcut `Ctrl+Shift+.` (`Command+Shift+.` on Mac) opens the panel via the toolbar action. `Ctrl+Shift+Enter` runs Clean AI paste. `Ctrl+Enter` still cleans.
- Settings migration. `normalizePunct` and `hintDismissed` are the same keys as 1.4.1. `cleanOnPaste` and `cleanOnCopy` are new and default to false when missing.
- Permissions are unchanged: `sidePanel` and `storage` only. No host access, no content scripts, no optional permissions. Per-site auto-clean, a highlight on arbitrary pages, and a live GitHub injection are not in this version because each one would let the extension read pages you visit. Paste a diff instead, and the highlight stays in the side panel.

## 1.4.1 (2026-11-17)

- Visual design system for the side panel and web app: shared color, type, spacing, and radius tokens; copper-on-paper light theme and ink dark theme; monospace for the text you inspect; crafted buttons, a switch, category chips, and reveal marks. Motion respects `prefers-reduced-motion`.
- New extension icon and Chrome Web Store screenshot / promo tile.
- Extension: explicit strict `content_security_policy` on extension pages; summary and category
  chips render with the DOM instead of `innerHTML` (preview marks still escape dynamic titles).
- Settings persist via `chrome.storage.sync`: punctuation-normalize toggle and first-run hint dismissal.
  The `storage` permission is the only addition — still no host access.
- Side panel: first-run tips, empty-state scan message, keyboard/file-drop accessibility, 5 MB file
  guard with read errors surfaced, and preview skipped past 20k characters (same cap as the web app).

## 1.4.0 (2026-10-23)

- Hidden text shown in plain words. Text smuggled in tag characters (ASCII smuggling) or
  packed into variation selectors is decoded and shown under the summary, so you can read
  what was hidden before you clean it. The web app and the library (`decodeHidden`) do the
  same.
- Emoji stay whole. Zero-width joiners, variation selectors and tag letters that build an
  emoji (a family, a red heart, a rainbow flag, a keycap, the England flag) are no longer
  flagged or removed, and the summary says how many were kept. The same characters anywhere
  else are still caught, including selectors stacked on an emoji to hide data.
- CI runs on Node 24 with current action versions, and the version check that had been
  failing since 1.3.1 now compares the manifest with `core.js`.

## 1.3.1 (2026-09-04)

- Report a miss: builds a GitHub issue with only the flagged code points, never your text.

## 1.3.0 (2026-08-26)

- Preview pane showing where each hidden character sits, per-category cleaning, and file drop.

## 1.2.2 (2026-08-23)

- The side panel says before input that pasted text stays local; direct privacy-policy link.

## 1.2.1 (2026-08-22)

- Store icon fitted to Chrome's safe area, and a second screenshot.

## 1.2.0 (2026-08-22)

- The Chrome build moves into a side panel and requests only the `sidePanel` permission.

## 1.1.0 (2026-08-01)

- Clearer popup labels, keyboard focus, live status feedback and reduced-motion support.

## 1.0.0 (2026-07-23)

- First release: reveal and remove zero-width characters, look-alike spaces, bidi controls,
  soft hyphens, tag characters and variation selectors, with optional punctuation
  normalizing.
