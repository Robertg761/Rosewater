#!/usr/bin/env node
/**
 * Patches the prebuild-generated android/app/build.gradle so release builds
 * are signed with the Rosewater release keystore instead of the debug key.
 *
 * The keystore is provided via environment variables (set by the release
 * workflow, or locally from keystore.properties):
 *   RW_SIGNING_STORE_FILE      absolute path to the keystore file
 *   RW_SIGNING_STORE_PASSWORD  keystore password
 *   RW_SIGNING_KEY_ALIAS       key alias
 *   RW_SIGNING_KEY_PASSWORD    key password
 *
 * Run after `npx expo prebuild --platform android`:
 *   node scripts/prepare_release_signing.js
 */

const fs = require("fs");
const path = require("path");

const gradlePath = path.join(process.cwd(), "android", "app", "build.gradle");
if (!fs.existsSync(gradlePath)) {
  console.error(`${gradlePath} not found. Run "npx expo prebuild --platform android" first.`);
  process.exit(1);
}

const original = fs.readFileSync(gradlePath, "utf8");

if (original.includes("signingConfigs.release")) {
  console.log("Release signing config already present; nothing to do.");
  process.exit(0);
}

const signingConfigsIdx = original.indexOf("signingConfigs {");
if (signingConfigsIdx === -1) {
  console.error(`Failed to find signingConfigs block in ${gradlePath}`);
  process.exit(1);
}

const releaseSigningConfig = `signingConfigs {
        release {
            storeFile file(System.getenv("RW_SIGNING_STORE_FILE"))
            storePassword System.getenv("RW_SIGNING_STORE_PASSWORD")
            keyAlias System.getenv("RW_SIGNING_KEY_ALIAS")
            keyPassword System.getenv("RW_SIGNING_KEY_PASSWORD")
            storeType "PKCS12"
        }`;

let updated =
  original.slice(0, signingConfigsIdx) +
  releaseSigningConfig +
  original.slice(signingConfigsIdx + "signingConfigs {".length);

// Point the release build type at the new config. The debug build type also
// references signingConfigs.debug, so only rewrite inside `release { ... }`.
const buildTypesIdx = updated.indexOf("buildTypes {");
if (buildTypesIdx === -1) {
  console.error(`Failed to find buildTypes block in ${gradlePath}`);
  process.exit(1);
}
const releaseBlockIdx = updated.indexOf("release {", buildTypesIdx);
if (releaseBlockIdx === -1) {
  console.error(`Failed to find release build type in ${gradlePath}`);
  process.exit(1);
}
const debugRefIdx = updated.indexOf("signingConfig signingConfigs.debug", releaseBlockIdx);
if (debugRefIdx === -1) {
  console.error(`Failed to find debug signingConfig reference in release build type of ${gradlePath}`);
  process.exit(1);
}

updated =
  updated.slice(0, debugRefIdx) +
  "signingConfig signingConfigs.release" +
  updated.slice(debugRefIdx + "signingConfig signingConfigs.debug".length);

fs.writeFileSync(gradlePath, updated);
console.log(`Patched ${gradlePath} to sign release builds with the Rosewater release keystore.`);
