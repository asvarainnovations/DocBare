interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  cleanupInterval?: number; // How often to clean up expired entries
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private readonly cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // 1000 entries default
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute default
    
    this.startCleanup();
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    };
  }

  /**
   * Get all valid keys
   */
  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= entry.ttl) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * Get all valid entries
   */
  entries<T>(): Array<[string, T]> {
    const now = Date.now();
    const validEntries: Array<[string, T]> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= entry.ttl) {
        validEntries.push([key, entry.value]);
      }
    }

    return validEntries;
  }

  /**
   * Get remaining TTL for a key
   */
  getTTL(key: string): number {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return -1; // Key doesn't exist
    }

    const elapsed = Date.now() - entry.timestamp;
    const remaining = entry.ttl - elapsed;

    if (remaining <= 0) {
      this.cache.delete(key);
      return -1; // Expired
    }

    return remaining;
  }

  /**
   * Extend TTL for a key
   */
  extendTTL(key: string, additionalTTL: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has already expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    // Extend TTL
    entry.ttl += additionalTTL;
    return true;
  }

  /**
   * Set TTL for a key
   */
  setTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has already expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    // Set new TTL
    entry.ttl = ttl;
    return true;
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.debug(`🧹 [CACHE][INFO] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroy the cache manager
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// Create default cache instances for different purposes
export const chatCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10 minutes for chat data
  maxSize: 500
});

export const userCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30 minutes for user data
  maxSize: 200
});

export const documentCache = new CacheManager({
  ttl: 60 * 60 * 1000, // 1 hour for document data
  maxSize: 100
});

export const sessionCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes for session data
  maxSize: 1000
});

// Utility functions for common cache operations
export const cacheUtils = {
  /**
   * Cache a function result
   */
  async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    cache: CacheManager = chatCache,
    ttl?: number
  ): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    cache.set(key, result, ttl);
    return result;
  },

  /**
   * Cache a function result with dependencies
   */
  async memoizeWithDeps<T>(
    key: string,
    deps: any[],
    fn: () => Promise<T>,
    cache: CacheManager = chatCache,
    ttl?: number
  ): Promise<T> {
    const depsKey = `${key}:${JSON.stringify(deps)}`;
    return cacheUtils.memoize(depsKey, fn, cache, ttl);
  },

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp, cache: CacheManager = chatCache): void {
    const keys = cache.keys();
    for (const key of keys) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  },

  /**
   * Preload data into cache
   */
  async preload<T>(
    key: string,
    fn: () => Promise<T>,
    cache: CacheManager = chatCache,
    ttl?: number
  ): Promise<void> {
    try {
      const result = await fn();
      cache.set(key, result, ttl);
    } catch (error) {
      console.warn(`🟡 [CACHE][WARN] Failed to preload cache for key: ${key}`, error);
    }
  }
};

// Export types
export type CacheEntryType<T> = CacheEntry<T>;
export type CacheOptionsType = CacheOptions; 