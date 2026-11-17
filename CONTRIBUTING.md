# Contributing

Thanks for helping improve Invisibles. This project stays intentionally small: one engine (`core.js`), a static web page, and a minimal MV3 side panel.

## Before you open a PR

1. Run the full check suite locally (see [README.md](README.md#development)).
2. If you change extension behavior, update or add tests in `core.test.js`, `site.test.js`, or `extension.test.js`.
3. Bump `extension/manifest.json` and `core.js` `VERSION` together when shipping a release-level change, and add a [CHANGELOG.md](CHANGELOG.md) entry.
4. Do not add host permissions, remote scripts, analytics, or network calls from the extension unless there is an explicit, reviewed reason.
5. Never include user paste content in logs, issue templates, or test fixtures unless it is synthetic.

## Security

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/cig13zs/invisibles/security/advisories/new) — see [SECURITY.md](SECURITY.md). Do not file public issues for exploitable problems.

## Code style

- Match existing files: no bundler, no framework, plain JavaScript.
- Prefer `textContent` / DOM APIs over `innerHTML` for untrusted or decoded text.
- Keep the extension permission set as small as possible; justify every new permission in the PR description.

## Pull requests

Use the PR template checklist. Include what you tested and whether store packaging (`python3 scripts/package.py`) still builds.