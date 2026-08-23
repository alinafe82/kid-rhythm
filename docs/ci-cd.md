# CI/CD operations

## Scope

React/Tauri application: dependency audit, lint, coverage-gated tests, production web build, Rust checks, and secret scanning.

## Required pull-request checks

- `CI`
- `Secret Scan`

Do not merge while a required check is failing, pending, or cancelled. Re-run a
job only after identifying whether the failure is transient; fix deterministic
failures in the branch.

## Failure response

The `CI Failure Alert` workflow creates or updates an owner-assigned issue when
a monitored workflow fails or times out. A later successful run closes that
issue, preserving a durable incident trail.

GitHub account notifications are configured under **Settings → Notifications →
System → Actions** with **Email** enabled and **Only notify failed workflows**
selected. Repository YAML cannot send arbitrary email without external mail
credentials, so GitHub's authenticated notification channel is the supported
email path.

For a failure:

1. Open the linked workflow run and identify the first actionable error.
2. Reproduce the narrowest matching check locally.
3. Fix the cause; do not weaken a gate to make it green.
4. Push the fix and verify every required check.
5. Confirm the alert issue closes after recovery.

## Maintenance

- Action dependencies are pinned to immutable full commit SHAs.
- Workflow tokens use explicit least-privilege permissions.
- Concurrency cancels stale pull-request work where safe.
- Jobs have timeouts so hung runners do not consume capacity indefinitely.
- Dependabot updates workflow actions and package ecosystems where applicable.

## Zero-cost execution policy

GitHub-hosted Actions are intentionally disabled while this repository is private because
private-repository minutes can become billable. The hardened workflow definitions remain as
the executable pipeline specification. Run the repository-specific commands above locally;
enable the workflows only after making the repository public or attaching a trusted
self-hosted runner. The account-level Actions budget remains at a hard $0 limit.
