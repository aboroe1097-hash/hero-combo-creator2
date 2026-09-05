# Security Policy

Hero Combo Creator includes public tools, account data, administrator workflows, and separately deployed Firebase/Cloudflare services. Report vulnerabilities privately to **aboroe1097@gmail.com**.

## What to include

- Affected release, page/service, and account role, without disclosing credentials.
- Minimal reproduction steps and expected versus observed access.
- Whether the issue involves auth, Firestore rules, App Check, rendering, stored data, or provider secrets.
- Sanitized evidence and any known mitigation.

Do not publish usable tokens, private screenshots, PINs, service-account keys, or member records in GitHub issues. Use your own test data; avoid probing other members' records or making destructive production writes.

## Current trust boundaries

- The dashboard uses Firebase account identity and server-verified admin claims. Role changes are handled by the setUserRole callable, whose handler checks the caller's superadmin claim. Browser UI state is not authority.
- Firestore rules define client read/write permissions. Firebase Admin SDK code bypasses those rules and must enforce its own authorization.
- The retained unlockAllStarBoh endpoint issues server-owned expiring grants used by protected flows. Its name does not imply the old BoH member UI still exists.
- App Check and origin allowlists are additional service checks; they do not replace account authorization.
- Public Firebase web configuration and hashes present in browser bundles are not server secrets. Provider API keys, service-account credentials, private PIN values, and debug tokens must remain outside tracked source.
- The static Pages release, Firebase services, and Cloudflare Worker deploy separately. A frontend patch alone cannot repair an undeployed server contract.

Implementation references: [Firestore rules](firestore.rules), [Functions](functions/README.md), [role handler](functions/src/user-roles.js), and [operations guide](docs/operations.md). These describe repository code, not a certification of current cloud-console configuration.

## Scope and response

Report unauthorized access, sensitive-data exposure, XSS/injection, unsafe storage, and deployed dependency/build vulnerabilities through this process. Game balance and ordinary data-quality issues belong in normal contribution channels.

We aim to acknowledge reports within seven days. Share remediation privately and allow maintainers time to investigate before public disclosure.
