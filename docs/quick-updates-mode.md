# Quick Updates Mode

> **Opt-in owner workflow.** This mode applies only when the owner explicitly opens a queue and asks to defer publication until the final item. It is not the default release gate and does not override AGENTS.md. Outside that mode, use focused verification and normal PR delivery. A later explicit request to publish the accumulated work ends the queue even if it does not use the exact phrase below.

[Normal release workflow](version-control-workflow.md) · [Documentation index](README.md)


Quick Updates Mode is the owner-led workflow for batching a long queue of small fixes against the current production release.

## During the queue

- Work only in the designated integration worktree and its `codex/` branch; never use the saved-project checkout.
- Apply each requested edit promptly and keep the local preview available on `http://127.0.0.1:5174` when Firebase or App Check is involved.
- Do not run verification checks, create release metadata, commit, push, or open a pull request while more queue items are expected.
- Treat each new message as another item in the same batch unless the owner replaces the request.

## Last queue gate

The exact owner message `last queue` ends the edit queue and authorizes the release workflow:

1. Review the complete diff and update the release version, changelog, and generated metadata when required.
2. Run focused verification where useful, then the scope-appropriate gate from AGENTS.md; broad/high-risk application changes require `npm run check`.
3. Stage only intended files, commit, push the integration branch, and open the next pull request into `gh-pages`.
4. Wait for required GitHub checks and owner review. Do not merge automatically.

If the batch changes Firestore rules, Firebase Functions, indexes, or configuration, deploy those reviewed Firebase components separately in dependency order and verify them; GitHub Pages does not deploy Firebase.
