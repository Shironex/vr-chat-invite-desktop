/**
 * GitHub API Cache
 *
 * Caches GitHub release data in localStorage to reduce API calls.
 * GitHub API has a rate limit of 60 requests/hour for unauthenticated requests.
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

const CACHE_KEY = "github_releases_cache";
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes default

/**
 * Get cached releases if valid
 */
export function getCachedReleases(): GitHubRelease[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedData<GitHubRelease[]> = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    // Invalid cache, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Cache releases with TTL
 */
export function setCachedReleases(
  releases: GitHubRelease[],
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const cacheData: CachedData<GitHubRelease[]> = {
    data: releases,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // localStorage might be full or unavailable
    console.warn("Failed to cache GitHub releases");
  }
}

/**
 * Get cache metadata (for debugging)
 */
export function getCacheInfo(): {
  isCached: boolean;
  cachedAt: Date | null;
  expiresAt: Date | null;
  itemCount: number;
  remainingMs: number;
} | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return {
        isCached: false,
        cachedAt: null,
        expiresAt: null,
        itemCount: 0,
        remainingMs: 0,
      };
    }

    const parsed: CachedData<GitHubRelease[]> = JSON.parse(cached);
    const remainingMs = Math.max(0, parsed.expiresAt - Date.now());

    return {
      isCached: remainingMs > 0,
      cachedAt: new Date(parsed.timestamp),
      expiresAt: new Date(parsed.expiresAt),
      itemCount: parsed.data.length,
      remainingMs,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the cache
 */
export function clearReleasesCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Fetch releases with caching
 */
export async function fetchReleasesWithCache(
  apiUrl: string,
  options: {
    ttlMs?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<{ releases: GitHubRelease[]; fromCache: boolean }> {
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false } = options;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCachedReleases();
    if (cached) {
      return { releases: cached, fromCache: true };
    }
  }

  // Fetch from API
  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const releases: GitHubRelease[] = await response.json();

  // Cache the results
  setCachedReleases(releases, ttlMs);

  return { releases, fromCache: false };
}
