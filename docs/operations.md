# Operations and troubleshooting

[Documentation index](README.md) · [Security](../SECURITY.md) · [Release workflow](version-control-workflow.md)

## Environment ownership

| Configuration | Owner/location | Notes |
|---|---|---|
| Public Firebase web settings | .env.example names; local ignored environment or production build settings | Public configuration is not authorization |
| App Check debug token | Local ignored environment and Firebase registration | Do not publish it in screenshots or logs |
| Qwen/DeepSeek provider keys | Server secret storage | Never prefix secrets with VITE_ or put them in browser data |
| Admin/superadmin roles | Firebase custom claims via authorized server handling | Local UI flags cannot grant privileges |
| Member unlock secrets | Firebase Functions secret bindings | See functions/README.md |
| Worker bindings/origins | wrangler.jsonc and deployed service configuration | Review source/deployed drift explicitly |

The frontend baseline is Node 20; Functions run on Node 22. Use the appropriate lockfile in each package. A frontend build does not install or deploy Functions.

## Diagnose before changing configuration

| Symptom | First checks |
|---|---|
| App opened as a local file fails | Start Vite; use its HTTP URL |
| Cloud tools unavailable locally | Check valid .env.local values and restart Vite |
| Protected OCR rejected | Separate ID-token, App Check, origin, membership, and provider failures; inspect sanitized status |
| Signed in but admin denied | Confirm the account's server claims and refresh its token; signing in is not admin approval |
| Firestore write rejected | Check the current deployed rules and the exact path/schema; do not relabel every refusal as signed out |
| Many size budgets unexpectedly fail | Run npm ci, rebuild, and compare toolchain versions before changing limits |
| Old chunks fail after a release | Inspect service-worker/current-version cache recovery and deployed references |
| Screenshot mismatch on CI | Check OS-specific baselines; do not accept a new image without visual review |
| Missing image flagged by a text search | Check dynamically constructed paths and post-build copy behavior |

For cloud testing, use the documented http://127.0.0.1:5174 local origin. Auth domains, App Check, and Worker CORS are separate settings. Preview Hosting success does not prove all three permit the preview hostname.

## Deployment boundaries

Pages deploys only dist/. Functions, Firestore rules/indexes, and Workers require their own reviewed deployment when changed. The [Functions guide](../functions/README.md) maps current exports; [Firebase preview](firebase-preview-workflow.md) explains temporary Hosting verification. Consult wrangler.jsonc for current Worker bindings and migrations before a Worker deployment; preserve deployed migration history.

Do not run write-producing verification helpers as if they were read-only smoke tests. The Arcade verification commands intentionally create disposable records and need a working cleanup path. Explicitly scope such operations to a known project and record the outcome.

## Error and retention records

Client error reporting uses a bounded local queue and Firestore delivery. Sanitize diagnostics before sharing them. Admin activity expiration timestamps and grant expiration checks are separate from TTL configuration: setting expiresAt does not itself enable server deletion. Verify any TTL policy in the service configuration, and never apply broad retention cleanup to roster, plan, or score data.

## Recovery record

For an incident, record the release/commit, affected service, account role, reproducible trigger, sanitized error, mitigation, and verification. Distinguish a code fix from a deployed fix. Keep private records out of public issues and reusable strategy knowledge.
