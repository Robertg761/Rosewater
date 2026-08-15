# Rosewater

A simple, private Android app for tracking hair care: wash days, products, vitamins & medications, progress photos, and reminders. All data stays on the phone — no account, no cloud, no ads.

## Features

- **Log a day** — pick what you did (shampoo, co-wash, clarify, deep condition, protein treatment, oil, heat, trim, protective style), tag the products used, rate the hair day 1–5 stars, add a note and photos. Under 30 seconds per entry.
- **Home dashboard** — days since last wash, deep condition, and trim at a glance, plus today's vitamin progress and recent entries.
- **Calendar** — month view with colored dots per activity type and a gold dot for vitamin days; tap a day to see or add entries.
- **Product Shelf** — her saved products with type, star rating, and "love it / hate it" notes. Archive products without losing history.
- **Vitamins** — customizable daily checklist (biotin, iron, meds, ...) with a streak counter; can back-fill previous days.
- **Progress photos** — photo journal with a side-by-side compare view.
- **Reminders** — wash day (every N days), daily vitamins (pick the hour), and trims (every N weeks).
- **Themes** — five palettes to pick from in Settings (Rosewater, Lavender, Fresh Mint, Sunset, and a dark Midnight), applied instantly and remembered. Springy micro-animations throughout (button presses, star ratings, checkbox pops, staggered card entrances).
- **Export** — one tap dumps all data to a JSON file via the Android share sheet.

## Tech

Expo (React Native, TypeScript), expo-sqlite for storage, expo-notifications for reminders, React Navigation (bottom tabs + modal stack). Photos are copied into the app's private storage so they survive gallery cleanups.

Issue reports use the serverless API in [`report-api`](report-api). The API authenticates as a
GitHub user through the production-only `GITHUB_ISSUE_TOKEN` Vercel environment variable. The
route is hardcoded to create labeled issues only in `Robertg761/Rosewater`. Never include the
token in the Expo app, logs, or Git.

## Running it

```bash
npm install
npm start          # then scan the QR code with the Expo Go app on the phone
npm run android    # or launch directly on a connected device/emulator
```

To install it permanently on a phone (with working notifications), grab the latest signed APK
from [GitHub Releases](https://github.com/Robertg761/Rosewater/releases) — or cut a new release
as described below.

## Releases & updates

Releases are built and published automatically by GitHub Actions
([release.yml](.github/workflows/release.yml)), and the installed app checks GitHub for newer
releases (once a day on launch, or on demand from Settings → Updates) and offers the APK
download in-app.

To cut a release:

1. Add a section to [CHANGELOG.md](CHANGELOG.md) headed `## [X.Y.Z] - YYYY-MM-DD` — it becomes
   the release notes.
2. Merge everything to `main`, then tag its HEAD and push the tag:

   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

The workflow validates the tag (SemVer, must point at `main` HEAD), syncs `app.json` /
`package.json` to the tag version (bumping `versionCode` so Android accepts the upgrade), builds
a signed APK with `expo prebuild` + Gradle, publishes the GitHub Release with the changelog
section and `Rosewater-X.Y.Z.apk` attached, and commits the version bump back to `main`.
A `-rc.N` / `-beta.N` tag publishes a prerelease, which the in-app updater ignores unless it
outranks the installed version.

Signing uses a keystore held in the `RW_KEYSTORE_B64`, `RW_SIGNING_STORE_PASSWORD`,
`RW_SIGNING_KEY_ALIAS`, and `RW_SIGNING_KEY_PASSWORD` repository secrets. The keystore file and
`keystore.properties` live only on the dev machine (gitignored) — **back them up**; losing them
means future releases can't install over existing ones.
