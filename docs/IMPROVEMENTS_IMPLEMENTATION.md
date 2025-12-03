# Improvements Implementation Guide

This document provides instructions for implementing the following improvements in other Electron projects:

1. **useTheme Hook Fix** - Event-based instead of polling
2. **GitHub API Caching** - Reduce API calls with localStorage cache

---

## 1. useTheme Hook (Event-Based)

### Problem
The original `useTheme` hook used `setInterval` with 100ms polling to detect theme changes. This caused unnecessary CPU usage and re-renders.

### Solution
Use a custom event system to notify when theme changes occur.

### Implementation

#### Step 1: Update Theme Helper

In your theme helper file (e.g., `src/helpers/theme_helpers.ts`), add event dispatching:

```typescript
import { ThemeMode } from "@/types/theme-mode";

const THEME_KEY = "theme";
export const THEME_CHANGE_EVENT = "app:theme-changed";

/**
 * Dispatch theme change event for same-window listeners
 */
function dispatchThemeChange(theme: ThemeMode) {
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } })
  );
}

export async function setTheme(newTheme: ThemeMode) {
  // ... existing theme switching logic ...

  localStorage.setItem(THEME_KEY, newTheme);
  dispatchThemeChange(newTheme);  // ADD THIS LINE
}

export async function toggleTheme() {
  // ... existing toggle logic ...

  localStorage.setItem(THEME_KEY, newTheme);
  dispatchThemeChange(newTheme);  // ADD THIS LINE
}
```

#### Step 2: Update useTheme Hook

Replace the polling-based hook with event-based:

```typescript
import { useState, useEffect, useCallback } from "react";
import { ThemeMode } from "@/types/theme-mode";
import { THEME_CHANGE_EVENT } from "@/helpers/theme_helpers";

const THEME_KEY = "theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return stored || "system";
  });

  const updateTheme = useCallback(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    setThemeState(stored || "system");
  }, []);

  useEffect(() => {
    // Listen for theme changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        updateTheme();
      }
    };

    // Listen for theme changes from same window (custom event)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
      setThemeState(customEvent.detail.theme);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, [updateTheme]);

  return { theme };
}
```

### Benefits
- No CPU overhead from polling
- Instant theme updates (no 100ms delay)
- Proper cleanup on unmount
- Works across tabs (via storage event)
- Works within same tab (via custom event)

---

## 2. GitHub API Caching

### Problem
GitHub API has a rate limit of 60 requests/hour for unauthenticated requests. Opening the changelog dialog repeatedly can quickly exhaust this limit.

### Solution
Cache release data in localStorage with a configurable TTL (time-to-live).

### Implementation

#### Step 1: Create Cache Helper

Create `src/helpers/github-cache.ts`:

```typescript
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
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get cached releases if valid
 */
export function getCachedReleases(): GitHubRelease[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedData<GitHubRelease[]> = JSON.parse(cached);

    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
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
    console.warn("Failed to cache GitHub releases");
  }
}

/**
 * Get cache info for debugging
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
 * Fetch releases with automatic caching
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
  setCachedReleases(releases, ttlMs);

  return { releases, fromCache: false };
}
```

#### Step 2: Update Changelog Component

In your changelog dialog component:

```typescript
import {
  fetchReleasesWithCache,
  getCacheInfo,
  clearReleasesCache,
} from "@/helpers/github-cache";

// Add state for cache tracking
const [fromCache, setFromCache] = useState(false);
const [cacheRemainingMs, setCacheRemainingMs] = useState(0);

// Update fetch function to use cache
const fetchReleases = async (forceRefresh = false) => {
  setLoading(true);
  setError(null);

  try {
    const result = await fetchReleasesWithCache(githubApiUrl, {
      forceRefresh,
      ttlMs: 15 * 60 * 1000, // 15 minutes
    });

    setReleases(result.releases);
    setFromCache(result.fromCache);

    const info = getCacheInfo();
    if (info) {
      setCacheRemainingMs(info.remainingMs);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// Add refresh handler
const handleRefresh = () => {
  clearReleasesCache();
  fetchReleases(true);
};

// Format remaining cache time
const formatCacheTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};
```

#### Step 3: Add Cache Indicator UI

Add to your dialog header:

```tsx
<div className="flex items-center gap-2">
  {fromCache && cacheRemainingMs > 0 && (
    <span className="text-xs text-muted-foreground">
      Cached ({formatCacheTime(cacheRemainingMs)})
    </span>
  )}
  <Button
    variant="ghost"
    size="icon"
    onClick={handleRefresh}
    disabled={loading}
    title="Refresh releases"
  >
    <RefreshCw className={loading ? "animate-spin" : ""} />
  </Button>
</div>
```

### Benefits
- Reduces GitHub API calls significantly
- 15-minute cache means most users never hit rate limits
- Users can force refresh if needed
- Visual indicator shows when data is from cache
- Cache automatically expires

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `ttlMs` | 15 min | Cache time-to-live |
| `forceRefresh` | false | Bypass cache and fetch fresh |

---

## Migration Checklist

### useTheme Fix
- [ ] Add `THEME_CHANGE_EVENT` constant to theme helpers
- [ ] Add `dispatchThemeChange()` function
- [ ] Call `dispatchThemeChange()` in `setTheme()` and `toggleTheme()`
- [ ] Update `useTheme` hook to use event listener instead of polling
- [ ] Test theme switching in same tab
- [ ] Test theme switching across tabs

### GitHub API Caching
- [ ] Create `github-cache.ts` helper file
- [ ] Update changelog component to use `fetchReleasesWithCache`
- [ ] Add cache state variables (`fromCache`, `cacheRemainingMs`)
- [ ] Add refresh button with handler
- [ ] Add cache indicator UI
- [ ] Test caching works (check Network tab)
- [ ] Test force refresh works
- [ ] Test cache expiration (wait 15 min or modify TTL)
