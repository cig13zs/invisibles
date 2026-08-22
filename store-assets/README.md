# Chrome Web Store checklist

Build and verify the deterministic upload archive:

```text
python scripts/package.py
python scripts/package.py --check
python tests/package.test.py
```

Upload `dist/invisibles-1.2.1.zip` and compare its SHA-256 value with the checked checksum sidecar.

Expected SHA-256:

`4a9886ec38da0bcf88e9029f11b0acfdfec2068bc139ca11dcd15952ee302adf`

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

## Dashboard fields

- Name: `Invisibles: Hidden Unicode Cleaner`
- Summary: `Reveal zero-width spaces, bidi controls and look-alike whitespace, then clean them locally.`
- Category: `Tools`
- Language: `English`
- Homepage: `https://cig13zs.github.io/invisibles/`
- Support: `https://github.com/cig13zs/invisibles/issues`
- Privacy policy: `https://cig13zs.github.io/invisibles/privacy.html`
- Single purpose: `Reveal and clean hidden Unicode in text the user pastes into the side panel.`
- `sidePanel` justification: `Opens the text inspector beside the current tab. It does not grant access to page content.`
- Remote code: `No`
- Data handling: user-provided text is processed transiently in page memory. It is not collected, stored, or transmitted.

Use `listing.txt` for the full description. Upload the 128 px icon from
`extension/icons/`, both 1280 x 800 screenshots, and the 440 x 280 promo tile.

## Account-only gate

The publisher contact email must be verified in the developer account. After
the package and listing fields are saved, review the privacy answers and choose
the intended visibility before submitting the item for review. Do not put the
publisher email or account identifiers in this repository.

Chrome's current references:

- [Listing fields and assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)
- [Publishing flow](https://developer.chrome.com/docs/webstore/publish/)
