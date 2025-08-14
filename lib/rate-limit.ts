interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: RateLimitConfig) {
  return {
    limit: async (identifier: string): Promise<RateLimitResult> => {
      const now = Date.now();
      const key = `${identifier}:${Math.floor(now / config.interval)}`;
      
      const current = rateLimitStore.get(key);
      
      if (!current || now > current.resetTime) {
        // First request in this window
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.interval,
        });
        
        return {
          success: true,
          limit: config.uniqueTokenPerInterval,
          remaining: config.uniqueTokenPerInterval - 1,
          reset: now + config.interval,
        };
      }
      
      if (current.count >= config.uniqueTokenPerInterval) {
        // Rate limit exceeded
        return {
          success: false,
          limit: config.uniqueTokenPerInterval,
          remaining: 0,
          reset: current.resetTime,
        };
      }
      
      // Increment count
      current.count++;
      
      return {
        success: true,
        limit: config.uniqueTokenPerInterval,
        remaining: config.uniqueTokenPerInterval - current.count,
        reset: current.resetTime,
      };
    },
  };
}
