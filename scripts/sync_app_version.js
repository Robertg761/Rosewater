#!/usr/bin/env node
/**
 * Aligns app version metadata in app.json, package.json, and package-lock.json
 * to a release version.
 *
 * If expo.version already matches the release version, android.versionCode is
 * preserved. If the version changes, versionCode is incremented by one so
 * direct-download Android updates can install over the previous release.
 *
 * Usage:
 *   node scripts/sync_app_version.js 1.2.0
 */

const fs = require("fs");
const path = require("path");

const releaseVersion = process.argv[2];
if (!releaseVersion) {
  console.error("Usage: node scripts/sync_app_version.js <version>");
  process.exit(2);
}

const semverMatch = releaseVersion.match(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
);
const prereleaseIdentifiers = semverMatch?.[4]?.split(".") ?? [];
const hasInvalidNumericPrerelease = prereleaseIdentifiers.some(
  (identifier) => /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith("0")
);

if (!semverMatch || hasInvalidNumericPrerelease) {
  console.error(`Invalid release version: ${releaseVersion}`);
  process.exit(2);
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");

const appJsonPath = path.join(process.cwd(), "app.json");
const appJson = readJson(appJsonPath);

const currentVersion = appJson.expo?.version;
const currentVersionCode = appJson.expo?.android?.versionCode;

if (typeof currentVersion !== "string") {
  console.error(`Failed to find expo.version in ${appJsonPath}`);
  process.exit(1);
}
if (!Number.isSafeInteger(currentVersionCode) || currentVersionCode < 1) {
  console.error(`Invalid expo.android.versionCode in ${appJsonPath}: ${currentVersionCode}`);
  process.exit(1);
}

const nextVersionCode =
  currentVersion === releaseVersion ? currentVersionCode : currentVersionCode + 1;

appJson.expo.version = releaseVersion;
appJson.expo.android.versionCode = nextVersionCode;
writeJson(appJsonPath, appJson);

const packageJsonPath = path.join(process.cwd(), "package.json");
const packageJson = readJson(packageJsonPath);
packageJson.version = releaseVersion;
writeJson(packageJsonPath, packageJson);

const lockPath = path.join(process.cwd(), "package-lock.json");
if (fs.existsSync(lockPath)) {
  const lock = readJson(lockPath);
  lock.version = releaseVersion;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = releaseVersion;
  }
  writeJson(lockPath, lock);
}

console.log(
  `App version metadata aligned: version ${currentVersion} -> ${releaseVersion}, ` +
    `versionCode ${currentVersionCode} -> ${nextVersionCode}`
);
