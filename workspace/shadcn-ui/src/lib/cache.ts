// Simple in-memory cache with TTL (Time To Live)
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  constructor() {
    this.cache = new Map();
  }

  set(key: string, data: any, ttl: number = 60000): void {
    // Default TTL: 60 seconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    // Check if cache has expired
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return false;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > cached.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      if (age > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanup();
  }, 5 * 60 * 1000);
}

// Cache keys constants
export const CACHE_KEYS = {
  LOADS: 'loads',
  USER_LOADS: (userId: string) => `user_loads_${userId}`,
  LOAD_DETAIL: (loadId: string) => `load_${loadId}`,
  DOCUMENTS: 'documents',
  USERS: 'users',
  BIDS: (loadId: string) => `bids_${loadId}`,
  MESSAGES: (loadId: string) => `messages_${loadId}`,
  INVOICES: 'invoices',
};

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30000,      // 30 seconds
  MEDIUM: 60000,     // 1 minute
  LONG: 300000,      // 5 minutes
  VERY_LONG: 900000, // 15 minutes
};
