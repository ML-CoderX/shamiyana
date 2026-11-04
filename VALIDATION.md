# Validation — updated 4 November 2026

## Android APK delivered

- File: `artifacts/shamiyana-preview.apk` (44,501,528 bytes).
- Package: `com.tentbilling.app`, version 1.0.0 (version code 1).
- Android minimum API 24; target API 36.
- Architectures: ARM64 and x86_64.
- APK signature verified successfully with Android `apksigner` (v2 scheme).
- Signed with the generated Android debug/test key: suitable for preview installation, not a production store release.
- SHA-256: `FF92CB6BD60423D84C749D18EAECF70B17672595F0CB06058600520990E2F9AC`.
- Standalone JavaScript bundle is packaged inside the APK; Expo Go and Metro are not needed to use it.

The redesigned APK installed and launched on the Pixel 6 Android emulator. Home, Orders, New Order, the Materials editor sheet and Settings were captured and compared with the Stitch references after implementation. The date picker and Kannada Home were also opened. The initial system dialog was dismissed before comparing screens. Physical device and iOS UI checks remain pending.

## Passed

- Nine automated regression tests (`npm test`).
- Application JavaScript and JSX parsing.
- Android and iOS production Hermes bundle export.
- Expo dependency compatibility check using the installed SDK's offline dependency map.
- Package manifest and lockfile consistency.

The database tests execute real SQLite through a small adapter matching the Expo API. They verify atomic order rollback, historical price/name retention, safe catalog deletion, bill upserts, bill-total validation and settings persistence. Calculation, date, PDF-escaping and translation checks are also included.

## Not verified

- Full keyboard and large text coverage across all screens.
- Native SQLite behavior on Android/iOS hardware.
- English/Kannada PDF rendering, multipage layout and actual sharing.
- Production signing and store distribution.

An installed Pixel 9 emulator was launched and the cached SDK 54-compatible Expo Go APK installed successfully. Android's system services repeatedly failed (`package`, `input`, and `activity`), and Pixel Launcher reported an application-not-responding error. The app did not reach a verifiable rendered screen. The emulator was stopped after the attempt; this is an environment limitation, not a successful device test.

Use the device release checklist in README.md before production distribution. EAS preview build configuration is included, but no cloud build, account setup or publication was performed. The preview APK above was built locally and test-signed.
