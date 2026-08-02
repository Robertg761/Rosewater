import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * In-app update check against GitHub Releases.
 *
 * Releases are published by .github/workflows/release.yml as a signed APK
 * asset on https://github.com/Robertg761/Rosewater/releases. The app compares
 * its own version against the latest release tag and, when a newer version
 * exists, offers the APK download link.
 */

const OWNER = 'Robertg761';
const REPO = 'Rosewater';

export interface UpdateInfo {
  latestVersion: string;
  apkName: string;
  apkUrl: string;
  releaseNotes: string;
  releaseUrl: string;
  apkSizeBytes: number | null;
  publishedAt: string | null;
}

/** Expo Go runs the dev bundle under Expo Go's own versioning, so update
 * checks are meaningless there. */
export function updatesAvailable(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

export function parseSemVer(raw: string): SemVer | null {
  const match = raw
    .trim()
    .replace(/^v/i, '')
    .match(
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
    );
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

/** Returns a negative number if a < b, positive if a > b, zero if equal. */
export function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // A release always outranks its prereleases.
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;

  const len = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < len; i++) {
    const ai = a.prerelease[i];
    const bi = b.prerelease[i];
    if (ai === undefined) return -1;
    if (bi === undefined) return 1;
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);
    if (aNum && bNum) {
      if (Number(ai) !== Number(bi)) return Number(ai) - Number(bi);
    } else if (aNum) {
      return -1;
    } else if (bNum) {
      return 1;
    } else if (ai !== bi) {
      return ai < bi ? -1 : 1;
    }
  }
  return 0;
}

interface GitHubAsset {
  name?: string;
  browser_download_url?: string;
  size?: number;
}

interface GitHubLatestRelease {
  tag_name?: string;
  html_url?: string;
  body?: string;
  published_at?: string;
  assets?: GitHubAsset[];
}

/** Strips markdown/HTML down to plain text for the update sheet. */
export function sanitizeReleaseNotes(raw: string): string {
  return raw
    .split('\n')
    .map((line) =>
      line
        .replace(/<[^>]+>/g, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\s*[-*]\s+/, '- ')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`/g, '')
        .trimEnd()
    )
    .filter(
      (line) =>
        line.length > 0 &&
        !line.toLowerCase().includes('raw.githubusercontent.com') &&
        !line.toLowerCase().includes('rosewater-logo')
    )
    .join('\n');
}

/**
 * Returns info about a newer release, or null when this build is current
 * (or the latest release carries no APK). Throws on network/API errors.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const release: GitHubLatestRelease = await res.json();

  const latestTag = release.tag_name?.trim() ?? '';
  const latest = parseSemVer(latestTag);
  const current = parseSemVer(currentVersion());
  if (!latest || !current || compareSemVer(latest, current) <= 0) return null;

  const apkAssets = (release.assets ?? []).filter(
    (a) => a.name?.toLowerCase().endsWith('.apk') && a.browser_download_url
  );
  if (apkAssets.length === 0) return null;

  // Prefer non-debug APKs if multiple exist.
  const apk = apkAssets.find((a) => !a.name!.toLowerCase().includes('debug')) ?? apkAssets[0];

  return {
    latestVersion: latestTag.replace(/^v/i, ''),
    apkName: apk.name!,
    apkUrl: apk.browser_download_url!,
    releaseNotes: sanitizeReleaseNotes(release.body ?? ''),
    releaseUrl: release.html_url?.trim() ?? `https://github.com/${OWNER}/${REPO}/releases`,
    apkSizeBytes: apk.size ?? null,
    publishedAt: release.published_at?.trim() ?? null,
  };
}
