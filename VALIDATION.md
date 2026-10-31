# Validation — 30 October 2026

## Passed

- Nine automated regression tests (`npm test`).
- Application JavaScript and JSX parsing.
- Android and iOS production Hermes bundle export.
- Expo dependency compatibility check using the installed SDK's offline dependency map.
- Package manifest and lockfile consistency.

The database tests execute real SQLite through a small adapter matching the Expo API. They verify atomic order rollback, historical price/name retention, safe catalog deletion, bill upserts, bill-total validation and settings persistence. Calculation, date, PDF-escaping and translation checks are also included.

## Not verified

- Native screen appearance and keyboard behavior.
- Native SQLite behavior on Android/iOS hardware.
- English/Kannada PDF rendering, multipage layout and actual sharing.
- A signed/installable application build.

An installed Pixel 9 emulator was launched and the cached SDK 54-compatible Expo Go APK installed successfully. Android's system services repeatedly failed (`package`, `input`, and `activity`), and Pixel Launcher reported an application-not-responding error. The app did not reach a verifiable rendered screen. The emulator was stopped after the attempt; this is an environment limitation, not a successful device test.

Use the device release checklist in README.md before distributing the app. EAS preview build configuration is included, but no cloud build, account setup, signing, publication or APK delivery was performed.
