// Sessionist In-App Update Configuration & GitHub Integration

export const CURRENT_VERSION = '1.0.1';

export const GITHUB_REPO_OWNER = 'JmjomDev';
export const GITHUB_REPO_NAME = 'sessionist.github.io';

// GitHub Official Endpoints
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
export const GITHUB_RAW_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/version.json`;

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
}

/**
 * Compare two semver strings (e.g. "1.0.1" vs "1.0.0").
 * Returns true if v1 > v2.
 */
export function isNewerVersion(v1: string, v2: string): boolean {
  const cleanV1 = v1.replace(/^v/i, '').trim();
  const cleanV2 = v2.replace(/^v/i, '').trim();

  const parts1 = cleanV1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = cleanV2.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
}

/**
 * Asynchronously checks GitHub for updates.
 * First tries official GitHub Releases API (`/releases/latest`), then falls back to `version.json` on `main`.
 * Fails silently if offline or request fails.
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  // 1. Try official GitHub Releases API
  try {
    const response = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const release = await response.json();
      const tagName = release.tag_name || release.name || '';
      const cleanVersion = tagName.replace(/^v/i, '');

      if (cleanVersion && isNewerVersion(cleanVersion, CURRENT_VERSION)) {
        // Look for an attached asset (.apk, .exe, etc.) or fall back to release html_url
        const primaryAsset = release.assets?.[0];
        const downloadUrl = primaryAsset?.browser_download_url || release.html_url;

        return {
          version: cleanVersion,
          downloadUrl,
          releaseNotes: release.body || 'New update available with bug fixes and performance improvements.',
        };
      }
    }
  } catch (err) {
    console.warn('[Update Checker] GitHub Releases API check failed, trying raw version fallback...', err);
  }

  // 2. Fallback to raw version.json on main branch
  try {
    const fallbackResponse = await fetch(GITHUB_RAW_VERSION_URL, { cache: 'no-store' });
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      const latestVer = data.latestVersion || data.version || '';
      if (latestVer && isNewerVersion(latestVer, CURRENT_VERSION)) {
        return {
          version: latestVer.replace(/^v/i, ''),
          downloadUrl: data.downloadUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
          releaseNotes: data.notes || data.releaseNotes || 'New update available with bug fixes and performance improvements.',
        };
      }
    }
  } catch (err) {
    console.warn('[Update Checker] Silent network check failed:', err);
  }

  return null;
}
