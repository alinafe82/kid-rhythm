# macOS development

The Tauri application wraps the React/Vite planner. It uses local device storage; it does not add a cloud account or synchronization.

Requirements: a supported Node.js toolchain, Rust, and Xcode command-line tools/macOS SDK. Install the project dependencies with `npm ci`.

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path src-tauri/Cargo.toml --jobs 1
cargo test --locked --manifest-path src-tauri/Cargo.toml --jobs 1
npm run desktop:build
```

The current Rust harness contains no functional test cases. A passing Cargo test build establishes compilation and linking, not native interaction coverage. Web behavior is checked separately in the browser.

Desktop packaging is for local development. Public signed/notarized macOS distribution is separate work and is not established by a passing web build or Cargo check.
