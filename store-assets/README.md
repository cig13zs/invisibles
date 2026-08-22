# Chrome Web Store checklist

Build and verify the deterministic upload archive:

```text
python scripts/package.py
python scripts/package.py --check
python tests/package.test.py
```

Upload `dist/invisibles-1.2.1.zip` and compare its SHA-256 value with the checked checksum sidecar.

Use the copy in `listing.txt`, category `Tools`, and the public privacy URL:

`https://cig13zs.github.io/invisibles/privacy.html`

The privacy dashboard should disclose that users paste text into the extension and that all character analysis and cleaning happen locally. The extension collects and transfers no user data. Its sole permission is `sidePanel`; it has no host permissions or content scripts.

## Images

- `screenshot-1280x800.png` is the main product screenshot.
- `screenshot-review-1280x800.png` shows the review-before-cleaning state.
- `promo-440x280.png` is the small promotional tile.

The screenshots embed the shipped `extension/sidepanel.html`, run the shipped
`core.js` and `popup.js`, and fill the panel with fictional local samples.
They do not use a signed-in browser profile or real user text.

Rebuild and verify the PNG files with local Chrome:

```text
node store-assets/capture.js
node store-assets.test.js
```

Set `INVISIBLES_CHROME` if Chrome is not installed at a standard path.
