# macOS App Packaging

KidRhythm can run as a macOS desktop app through Tauri. The current desktop build wraps the existing React/Vite app and keeps the same local-first browser storage behavior.

## Local Build

Prerequisites on this machine:

- Xcode is installed.
- Rust was installed with Homebrew.
- Tauri CLI is installed as a dev dependency.

Commands:

```bash
npm install
npm run desktop:build
```

Current successful output:

```text
src-tauri/target/release/bundle/macos/KidRhythm.app
```

The app bundle is currently unsigned and intended for local development/testing.

## DMG

There is a DMG script available through Tauri:

```bash
npm run desktop:build:dmg
```

The first DMG attempt compiled the native app but failed during the final `bundle_dmg.sh` step after producing the `.app` bundle. Keep the default desktop build app-only until signing/distribution is ready.

## Signing And Notarization

Public macOS distribution needs Apple signing and notarization work:

- Apple Developer Program membership.
- Developer ID Application certificate in the macOS keychain.
- Apple notarization credentials or App Store Connect API key.
- Tauri signing/notarization configuration.
- A final DMG build after credentials are configured.

Tauri distribution docs:

- https://tauri.app/distribute/
- https://tauri.app/distribute/sign/macos/

Apple notarization docs:

- https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
