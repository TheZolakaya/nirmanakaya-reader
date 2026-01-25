'use client';

// === SIMPLE CLIENT-SIDE CACHE ===
// Stale-while-revalidate pattern for faster page loads

const CACHE_PREFIX = 'nkya_cache_';
const DEFAULT_TTL = 60 * 1000; // 1 minute default

/**
 * Get cached data if fresh, or return stale data while triggering refresh
 * @param {string} key - Cache key
 * @param {function} fetcher - Async function to fetch fresh data
 * @param {object} options - { ttl: ms, onFresh: callback }
 * @returns {Promise<{ data: any, isStale: boolean }>}
 */
export async function getCached(key, fetcher, options = {}) {
  const { ttl = DEFAULT_TTL, onFresh } = options;
  const cacheKey = CACHE_PREFIX + key;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < ttl) {
        // Fresh - return cached data
        return { data, isStale: false };
      } else {
        // Stale - return cached data immediately, refresh in background
        fetcher().then(freshData => {
          if (freshData) {
            setCache(key, freshData);
            onFresh?.(freshData);
          }
        }).catch(() => {}); // Silently fail background refresh

        return { data, isStale: true };
      }
    }
  } catch (e) {
    // Cache read failed, continue to fetch
  }

  // No cache - fetch fresh
  const data = await fetcher();
  if (data) {
    setCache(key, data);
  }
  return { data, isStale: false };
}

/**
 * Set cache data
 */
export function setCache(key, data) {
  const cacheKey = CACHE_PREFIX + key;
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Storage full or unavailable
  }
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {}
}

/**
 * Invalidate all cache entries matching a prefix
 */
export function invalidateCachePrefix(prefix) {
  try {
    const fullPrefix = CACHE_PREFIX + prefix;
    Object.keys(localStorage)
      .filter(k => k.startsWith(fullPrefix))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}
