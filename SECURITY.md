# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release on the [Chrome Web Store](https://chromewebstore.google.com/detail/ehfmbdppopedenilpgmhofcdibkilmbe) and `main` | Yes |
| Older tags | No |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Report privately: [Create a security advisory](https://github.com/cig13zs/invisibles/security/advisories/new)

Include:

- What you believe is wrong and the impact
- Steps to reproduce
- Extension version or commit, and browser if relevant

I aim to reply within one week. Credit in the fix is welcome unless you prefer to stay anonymous.

## Design assumptions

- **No host access** — the extension must not read arbitrary web pages.
- **No pasted-text exfiltration** — “Report a miss” must not include user input, only scan metadata. That includes no pasted words, hostnames, or decoded hidden text — code points and counts only.
- **Strict extension CSP** — no `unsafe-eval`, no remote script in extension pages.
- **Decoded hidden text is untrusted** — render with `textContent`, not raw HTML.

Only the latest release receives security fixes.