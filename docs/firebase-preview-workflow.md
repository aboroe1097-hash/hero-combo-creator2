# Firebase Preview Workflow

Firebase Hosting preview channels are an optional online prerelease gate reserved for major version
upgrades, broad overhauls, or changes that explicitly need Firebase Hosting validation. Normal
small releases follow the focused-check lane in AGENTS.md; a full local check is reserved for high-risk scope.
The production site still deploys only from the protected `gh-pages` branch after a pull request,
`deploy-verification`, owner review, and owner merge.

## Run the gate

From a release branch based on the latest `origin/gh-pages`:

```bash
npm run firebase:preview
```

The command performs these steps in order:

1. Runs the complete `npm run check` gate and creates a fresh `dist/` artifact.
2. Derives a channel name from `package.json` (`14.0.0` becomes `v14-0-0`).
3. Uses the project-pinned Firebase CLI to deploy only Hosting content from
   `firebase.preview.json` to project `abocombo` for seven days.
4. Reads the temporary `*.web.app` URL returned by Firebase.
5. Compares the remote HTML/service worker with the local artifact, then runs the production
   Playwright smoke suite against the main app, standalone pages, Arcade, and all five games.

If any local or online check fails, fix the issue and rerun the same command. When this optional
gate is used, do not commit or push the release branch until the Firebase preview is green.

When production test writes are explicitly in scope for Arcade persistence changes, verify the real anonymous-auth write/read contract against the
returned preview URL, then remove the temporary score row with the authenticated Firebase CLI:

```bash
npm run firebase:verify-arcade -- https://abocombo--CHANNEL-ID.web.app
```

The verifier writes a score-1 `Arcade Cloud Verify` row through the browser client, reads it back
through the public leaderboard path, and deletes it with the authenticated project-owner session in
a `finally` cleanup. Do not use it without a current `firebase login` session that can guarantee
cleanup.

If anonymous Auth is temporarily throttled by repeated preview smoke runs, verify the production
Firestore rules with a disposable signed-in user instead:

```bash
npm run firebase:verify-arcade-contract
```

This fallback verifies an authenticated score write and read, confirms that a lower best is denied,
then deletes both the temporary score row and Firebase Auth user in `finally` cleanup.

The expiry can be changed for one run with `FIREBASE_PREVIEW_EXPIRES` (for example, `1d`). A custom
channel can be supplied while retaining the full local gate:

```bash
npm run firebase:preview -- release-candidate
```

## Safety boundaries

- `firebase.preview.json` contains Hosting configuration only. The preview command cannot deploy
  Firestore rules, indexes, Functions, Storage rules, or the Firebase live Hosting channel.
- Every command passes project `abocombo` explicitly; the ignored local `.firebaserc` is not relied
  on for target selection.
- Preview URLs are temporary and difficult to guess, but public to anyone who has the URL.
- A preview channel uses the real `abocombo` Auth, Firestore, Analytics, and App Check resources.
  The automated smoke test initializes anonymous Auth and Analytics, although it performs no
  intentional Firestore writes. Keep additional QA read-only unless production writes are
  explicitly intended and reviewed.
- Firebase CLI adds the temporary hostname to Auth authorized domains so authentication can work;
  the wrapper treats a reported sync failure as a failed gate. Set
  `FIREBASE_PREVIEW_SKIP_AUTH_DOMAINS=true` to pass `--no-authorized-domains` for a static-only
  preview.
- Auth-domain synchronization does not authorize the preview hostname for reCAPTCHA Enterprise App
  Check. OCR also has its own Cloudflare origin allowlist. A green Hosting smoke test therefore does
  not claim OCR/App Check coverage on the temporary hostname.
- Cloudflare OCR access and undeployed Firestore-rule changes are separate production-service
  changes. Deploy them only when their files/contracts changed and the owner explicitly includes
  them in the release scope.
- The preview is evidence for the GitHub pull request; it is not promoted to Firebase's live
  channel. `gh-pages` remains the production source.

## Pull-request evidence

When the optional preview gate is used, record the preview URL, expiry, tested viewport(s), and any
deliberately untested backend flows in the pull request. After the preview passes, stage only
intended files, push the release branch, and open the pull request into `gh-pages`.

## Troubleshooting and scope checks

Confirm the CLI project and required login before starting. A missing authorized domain, App Check failure, Worker-origin refusal, and rejected Firestore write are different failures. The static Hosting smoke result covers only its exercised paths. Record deliberately untested backend operations and never infer a successful server deployment from a preview URL.

[Operations](operations.md) · [Release workflow](version-control-workflow.md) · [Documentation index](README.md)
