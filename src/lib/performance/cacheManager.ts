/**
 * Cache manager for optimizing data fetching and reducing API calls
 */

// Cache configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of items in cache

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  lastAccessed: number;
}

// Cache manager class
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>>;
  private cleanupInterval: number | null = null;

  private constructor() {
    this.cache = new Map();
    this.startCleanupInterval();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Set a value in the cache
   */
  public set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    // Ensure cache doesn't grow too large
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Get a value from the cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    // Update last accessed time
    entry.lastAccessed = Date.now();
    
    return entry.data as T;
  }

  /**
   * Remove a value from the cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get a value from the cache or compute it if not present
   */
  public async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const computedValue = await compute();
    this.set(key, computedValue, ttl);
    return computedValue;
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval === null) {
      this.cleanupInterval = window.setInterval(() => {
        this.cleanupExpiredEntries();
      }, 60 * 1000); // Run cleanup every minute
    }
  }

  /**
   * Stop the cleanup interval
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

/**
 * React hook for using cached data
 */
import { useState, useEffect } from 'react';

export function useCachedData<T>(
  key: string,
  fetchData: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
  dependencies: any[] = []
): { data: T | null; isLoading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(cacheManager.get<T>(key));
  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [error, setError] = useState<Error | null>(null);

  const fetchAndCacheData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchData();
      cacheManager.set(key, result, ttl);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!data) {
      fetchAndCacheData();
    }
  }, [key, ...dependencies]);

  const refetch = async () => {
    await fetchAndCacheData();
  };

  return { data, isLoading, error, refetch };
}