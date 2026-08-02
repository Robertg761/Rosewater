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

## Running it

```bash
npm install
npm start          # then scan the QR code with the Expo Go app on the phone
npm run android    # or launch directly on a connected device/emulator
```

To install it permanently on her phone (with working notifications), build an APK:

```bash
npx eas build --platform android --profile preview
```

(Requires a free Expo account; see https://docs.expo.dev/build/setup/.)
