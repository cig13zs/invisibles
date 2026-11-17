# Changelog

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
