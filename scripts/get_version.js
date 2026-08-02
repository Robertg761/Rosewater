#!/usr/bin/env node
/**
 * Prints the app version metadata from app.json.
 *
 * Usage:
 *   node scripts/get_version.js
 */

const fs = require("fs");
const path = require("path");

const appJsonPath = path.join(process.cwd(), "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

const version = appJson.expo?.version;
const versionCode = appJson.expo?.android?.versionCode;

if (typeof version !== "string" || !Number.isSafeInteger(versionCode)) {
  console.error(`Missing expo.version or expo.android.versionCode in ${appJsonPath}`);
  process.exit(1);
}

console.log(`version=${version}`);
console.log(`versionCode=${versionCode}`);
