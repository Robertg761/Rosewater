# Changelog

## [1.2.0] - 2026-08-15

### Added
- **Automatic Issue Reporting**: Settings now lets users send a bug report directly to the Rosewater GitHub repository. Reports include the app version and Android version, but never attach hair care records or photos.

## [1.1.0] - 2026-08-02

### Added
- **Multiple Activities Per Entry**: "What did you do?" now supports selecting several activities on one entry — log a wash, deep condition, and trim together. Existing entries carry over unchanged.
- **New Activity Types**: Added "Shampoo", "Condition", and "Shampoo/Condition" options.

### Changed
- **Themed Popups**: Confirmations and messages now use Rosewater-styled dialogs instead of stock Android alerts.

## [1.0.1] - 2026-08-02

### Changed
- **Much Smaller Download**: The Android APK shrank from 92 MB to 31 MB by shipping only 64-bit ARM native code and enabling code minification and resource shrinking. Note: this release no longer installs on 32-bit phones or x86 emulators.

## [1.0.0] - 2026-08-02

### Added
- **Wash Day Tracking**: Log wash days with products used, techniques, and notes, and see them on a monthly calendar.
- **Product Shelf**: Keep a shelf of hair products with ratings and repurchase notes.
- **Vitamins & Medications**: Track daily vitamins and medications with a simple daily checklist.
- **Progress Photos**: Take or import hair progress photos and browse them over time.
- **Reminders**: Optional wash-day, daily-vitamin, and trim reminders as local notifications.
- **Themes**: Multiple color themes, including dark options.
- **Private By Design**: All data stays on the phone in SQLite — no account, no cloud, no ads — with one-tap JSON export.
