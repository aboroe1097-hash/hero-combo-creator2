# PR #286 / #287 functional and interface audit

Audited on 2026-10-11 from production commit `1d93f7d1` (16.6.18). Follow-up release: 16.6.19.

## Findings addressed

- `tabs/admin.html`: the working-preview shortcut was labeled as the public view, although it reads saved working data. It now explicitly says **Preview working season**.
- `js/ocr-dashboard.js`: only the globally selected tab was keyboard-focusable. Other tab groups had no keyboard entry; arrow navigation included hidden leadership controls. Each permitted group now has an entry, unavailable controls are skipped, and tabs identify their panels.
- `css/admin-command-center.css`: the mobile command card occupied almost an entire phone screen, followed by competing navigation rails. Compact shortcuts and a native grouped tool picker make every permitted tool reachable without the fixed horizontal dock.
- `tabs/admin.html`: signups appeared inside the Eden workspace even though they use the competition's independent records. They now belong to alliance operations. Context text explains whether the selected tool follows Eden or alliance-wide records.
- `js/ocr-dashboard.js`: shortcuts switched panels without taking the operator to the relevant form. Season creation and recovery now focus their respective cards. The tool selection is retained in the URL and restored after authentication.
- `js/ocr-dashboard.js`: the dashboard could become visible before its command shortcuts were bound. Binding now happens before authentication restores the dashboard, so an early click is handled.
- `css/admin-command-center.css`, `js/admin-operations.js`: season creation, result imports, recovery and incident controls had inconsistent form sizing, spacing and action styles. Forms now use responsive columns, consistent controls and clear copy explaining what a season copies.
- `js/admin-operations.js`: the new effective-settings summary now refreshes after saves and concurrent updates, including when the editing form has unsaved changes.
- `js/admin-operations.js`: resolving a report immediately deleted it. Removal now requires confirmation. Ordinary Admins can also read the effective notice and individual pauses without receiving editing controls.

## Functional coverage

| Surface | Verification |
| --- | --- |
| Future Eden seasons | Isolated draft initialization, retry safety, clean totals, optional copying, publication and prior-season preservation through unit and emulator checks; rendered X8 creation flow through browser fixtures |
| Publication and recovery | Cloud snapshot composition, atomic publication, immutable revisions, rollback and stale-writer checks; backup coverage and restore conflict tests |
| X2 management migration | Missing import, reviewed import precedence, failed/empty fetches, concurrent imports and voting-season changes |
| Generic public hubs | Published X8 discovery, historical hub links, arbitrary labels, mobile width, unpublished-data protection and valid workspace routing |
| Private preview | Guest/member rejection, Admin access, disabled voting, no public reads and no persisted draft cache |
| Independent vote privacy | Member and management counts independently redacted from public data and rendered results, including both hidden |
| VtsScore review | Full raw JSON/CSV provenance, reconciliation, extreme-growth warnings, inclusive configurable Dragon threshold, shared-setting conflicts and category images |
| Throne assignments | Ordinary Admin access, shared weekly records, stale revision rejection, member rejection and icon-based image export |
| Leadership roles | Auth-authoritative role listing, forged profile resistance, current privilege checks, self-demotion protection and refresh-session revocation |
| Runtime controls | Expiry and pause behavior, Super Admin recovery, worker/function gates, concurrent setting refusal and report-removal confirmation |
| Error reporting | Retry queue retains undelivered reports; existing regression tests |

Browser cloud fixtures execute the application's production controllers against isolated records. They never write to the live database. Firestore emulator checks exercise actual rules with separate Admin, Super Admin and member identities.

## Live read-only checks

- Role listing/changes, signup administration, complaints and VtsScore Firebase Functions report ACTIVE.
- Released Firestore rules match the checkout: **170,087 bytes**, release timestamp `2026-10-11T12:41:01.937639Z`.
- `admin.html`, `eden-season.html` and `vtsscore.html` return HTTP 200.
- AI health reports enabled; OCR status reports primary, fallback and App Check configuration available.

Health responses establish service availability and configuration, not successful paid provider inference. This audit does not alter live seasons, roles, notices, competition data or throne assignments. Account recovery, billing and disaster restoration remain operator rehearsals described in the handover guide.

## Verification record

Baseline: `check:fast` passed all 2,300 unit tests; 24 focused browser cases passed. The publication/projection/operations selection passed 31 tests, and the backup/recall/privacy/throne/role/worker/VtsScore selection passed 39 tests.

Fresh Firestore emulator rehearsal: **33 Eden lifecycle/access checks and 28 throne/settings/privacy checks passed**. Denied-write messages in the emulator log are expected negative-access assertions.

Final `check:fast` passed **2,300/2,300 unit tests**, version consistency, lint, formatting and translation checks. The seven new browser workflows passed, and the revised command center passed on desktop and mobile in both themes. The settings-summary regression passed after its correction. Browser captures were visually reviewed for season/recovery forms, website health, winner/category exports, the Top 20 poster and multilingual throne assignments.

Local browser retries experienced loading/capture timeouts during simultaneous build work; the affected desktop and operations cases passed when run separately. Production build and version consistency passed. Size verification measured **12,095.7 KiB total JavaScript and 861 deployed files**. The aggregate JavaScript cap moves from 12,092 to 12,099 KiB to cover the intentional admin controls with approximately 3 KiB of CI margin; no duplicated asset graph or new production files were found, and all route, CSS and media caps remain unchanged. The size check passes with this measured cap.

CI follow-up: PR #288 exposed an outdated unit assertion for the final JavaScript budget. The assertion now expects the measured 12,099 KiB cap, preserving the existing guard. No application code or budget was changed by this correction.

No backend contract or rules change is required for the interface corrections.

UI review used the [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).
