# Tent Billing / Shamiyana

Offline-first Android app for tent and decoration rental businesses, built with Expo SDK 54. Materials, orders, bills and shop details are stored in SQLite on the device. English and Kannada are included.

## Run

Use Node 22.13 or later (Node 24 LTS is suitable).

```sh
npm ci
npm start
```

Open with an Expo Go version compatible with SDK 54, or use an Android emulator with `npm run android`.

## Workflow

1. Open **Settings** and enter your real shop name, phone and address. These details appear on PDFs; no example business details are used.
2. Open **Materials** to add rental items, units, prices and optional categories. Tap an item to edit it.
3. Create a **New Order**, enter the customer and optional event details, then add materials and quantities. Dates use `DD-MM-YYYY`.
4. In **Billing**, apply a 0–100% discount or set the final amount manually. **Save Bill** stores it without opening another app; **Download & Share Bill** also generates a PDF and opens the native share sheet.
5. Change the order status to **Pending**, **Delivered** or **Returned**. Filter the Orders screen by status.
6. Toggle English/Kannada from Home. The language is remembered and used for the bill labels.

Orders save atomically with their items. Prices and material names are snapshotted, so later catalog edits or deletions do not change earlier orders. Re-saving a bill updates the existing bill. Money is rounded to two decimals per line; supported totals range from zero to ₹10,000,000,000. A material must cost at least ₹0.01. For per-day rentals, enter the combined billable quantity (for example, 10 chairs × 3 days = 30 chair-days).

PDF sharing requires native device support and an installed destination app. The app opens the share sheet; it does not automatically send messages. A PDF/share failure leaves the saved bill available to retry. Data stays on the device: uninstalling the app or clearing its storage can remove it. Cloud sync and backup/restore are not implemented.

## Validation

```sh
npm test
npm run check
npm run export
```

The tests use Node SQLite with an adapter for the Expo database API. They cover transaction rollback, historical prices after catalog deletion, bill updates, invalid financial inputs, calendar dates, settings, PDF escaping, translations and source parsing. They do not replace native device testing.

On this Windows sandbox, Hermes may be unable to write its default temporary folder. Use a project-local temporary folder when needed:

```powershell
New-Item -ItemType Directory -Force .tmp | Out-Null
$env:TEMP = Join-Path (Get-Location) '.tmp'
$env:TMP = $env:TEMP
npm run export
```

## Android APK

The locally built preview is at `artifacts/shamiyana-preview.apk`. Copy it to an ARM64 Android phone (Android 7 or newer) and open it to install, allowing installation from that file source if Android asks. It runs without Expo Go or a development server. This is a test-signed preview; device workflow and PDF-sharing checks remain pending. See `VALIDATION.md` for verification details and the file checksum.

For a local Windows preview build with Android Studio's JDK and the Android SDK installed:

```powershell
.\scripts\build-android.ps1
```

The script generates the Android project if needed, builds a standalone release-mode APK with bundled JavaScript, and copies it to `artifacts/shamiyana-preview.apk`. It targets ARM64 phones and x86_64 emulators. Set `JAVA_HOME` and `ANDROID_HOME` if your tools are installed elsewhere. The generated project's debug/test key signs this preview; use your own protected signing key for a production release.

`eas.json` includes an internal `preview` profile that builds an APK. With EAS CLI installed and your own Expo account authenticated:

```sh
eas build --platform android --profile preview
```

The EAS route requires account/project setup, signing and a cloud build. The exported `dist/` Hermes bundles are not an APK. The current package identifiers are `com.tentbilling.app`; confirm your intended identifiers before publishing.

## Device release checks

- Create materials and an order; save a discounted bill, reopen it, and verify its amount.
- Change a catalog price and delete an item; verify earlier orders retain their details.
- Change and filter order statuses; restart and verify persistence.
- Switch to Kannada, restart, and verify the language and every label.
- Generate English and Kannada PDFs, inspect glyphs and pagination, and share through an installed app.
- Check forms with the keyboard open, large font settings, and a small screen.
- Verify startup/retry behavior and confirm no duplicate orders from repeated taps.

## Source map

- `App.js`: startup, safe-area provider and navigation.
- `db/database.js`: schema, transactions, catalog, orders, bills and settings.
- `screens/`: home, materials, orders, new order, billing and settings.
- `utils/billing.js`: number/date validation and currency calculations.
- `utils/pdf.js`: escaped bilingual HTML and native PDF sharing.
- `i18n/`: translations and saved language preference.
- `tests/core.test.cjs`: regression suite.
