# Checks and release

The workflows run web lint, coverage-gated tests and production build, Tauri core checks, and secret scanning. Dependency updates remain pinned in the lockfiles; action versions use immutable commit hashes.

Before merging, inspect the actual current-head checks and investigate executed failures. Local checks are useful evidence but do not turn a blocked or missing hosted check into a success. Do not reduce tests or bypass safeguards to make an update green.

For a release, verify the exact merged source in the deployment provider, then test the public URL and the parent flow. A merged commit or successful build alone does not establish a working public deployment.
