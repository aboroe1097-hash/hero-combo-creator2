# Security Policy

Hero Combo Creator is a community toolkit that includes Firebase-backed features, admin-only dashboard flows, and user-provided API keys. Please report security issues privately.

## Reporting A Vulnerability

Email: aboroe1097@gmail.com

Please include:

- A short description of the issue and affected page or feature.
- Steps to reproduce, with screenshots or logs if safe to share.
- Whether the issue exposes admin access, Firestore data, API keys, player data, or stored local data.
- Any suggested fix or mitigation.

Do not open a public issue for vulnerabilities involving credentials, admin access, Firestore rules, API keys, private alliance data, or stored user data.

## Scope

In scope:

- Firebase security rules and anonymous-auth access.
- Admin dashboard access and roster/OCR data handling.
- API key storage or accidental exposure.
- XSS, HTML injection, or unsafe rendering of user-provided comments/data.
- Build or dependency vulnerabilities affecting the deployed app.

## Admin Auth Note

The dashboard's static admin hashes are shipped to the browser and should be treated as a convenience gate, not a secret server-side access control. Use long, unique admin passphrases when hashes are configured, keep destructive actions behind separate override hashes, and prefer Firebase Auth or another server-verified role system for stronger future admin access.

Out of scope:

- Game balance, ranking, or data accuracy issues.
- Publicly visible fan/community content.
- Issues requiring physical access to another user's device.

## Expectations

We aim to acknowledge reports within 7 days. Please give maintainers reasonable time to investigate and patch before sharing details publicly.
