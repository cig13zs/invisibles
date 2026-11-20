# Chrome Web Store listing

Do not publish from this repository. Paste the fields below into the dashboard when you choose to ship 2.0.0.

## Name

`Invisibles: Find & Remove Hidden Characters (AI text cleaner)`

61 characters. The store limit is 75.

Why this name:

- **Invisibles** stays first, so the people who already installed it still recognize the listing.
- **Find & Remove Hidden Characters** says the job in the words people search for.
- **(AI text cleaner)** matches the other reason people open a tool like this: a chatbot reply that pastes badly. It does not claim the extension can tell who wrote the text, and it does not claim to remove a statistical watermark.

A brand-new name would hide the existing listing from the people who already have it.

## Short description

`Find and remove hidden characters, look-alike letters, and bidi tricks in pasted text. Local only, no host access.`

114 characters. The store limit is 132. This is also `description` in `extension/manifest.json`.

## Full description

The paste-ready text is [`store-assets/listing.txt`](store-assets/listing.txt). It keeps the promises the listing already made: no host access, text processed only in memory, never stored or transmitted, and the extension identifies characters rather than authorship or intent.

## Dashboard

| Field | Value |
| --- | --- |
| Category | Tools |
| Language | English |
| Homepage | https://cig13zs.github.io/invisibles/ |
| Support | https://github.com/cig13zs/invisibles/issues |
| Privacy policy | https://cig13zs.github.io/invisibles/privacy.html |
| Single purpose | Reveal and clean hidden Unicode, look-alike letters, and bidirectional controls in text the user pastes into the side panel. |
| Permission `sidePanel` | Opens the inspector beside the current tab. It does not grant access to page content. |
| Permission `storage` | Saves UI switches and a count of hidden characters cleaned. It does not save pasted text. |
| Remote code | No |

## What 2.0.0 deliberately does not request

Per-site auto-clean, a highlight painted on arbitrary pages, and a live GitHub review all need host access or a content script. This extension still requests neither. Clean-on-paste and clean-on-copy run inside the side panel. Code review runs on a diff or snippet you paste. The highlight is the preview in that panel.
