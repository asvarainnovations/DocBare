import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from './logger';

const apiLogger = createLogger('API');

interface RateLimitConfig {
  limit: number;        // Number of requests allowed
  windowMs: number;     // Time window in milliseconds
  keyGenerator?: (request: NextRequest) => string; // Function to generate unique key
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean;     // Skip counting failed requests
  handler?: (request: NextRequest, response: NextResponse) => NextResponse; // Custom handler for rate limit exceeded
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Default key generator using IP address
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `rate_limit:${ip}`;
}

// Default handler for rate limit exceeded
function defaultHandler(request: NextRequest): NextResponse {
  return NextResponse.json(
    { 
      error: 'Too many requests', 
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(60) // Retry after 1 minute
    },
    { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + 60 * 1000).toISOString()
      }
    }
  );
}

export function withRateLimit(
  config: RateLimitConfig
) {
  return function<T extends any[], R>(
    handler: (request: NextRequest, ...args: T) => Promise<R>
  ) {
    return async (request: NextRequest, ...args: T): Promise<R> => {
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const key = keyGenerator(request);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + config.windowMs
        };
        rateLimitStore.set(key, entry);
      }

      // Check if rate limit exceeded
      if (entry.count >= config.limit) {
        apiLogger.warn('Rate limit exceeded', {
          key,
          limit: config.limit,
          windowMs: config.windowMs,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.ip
        });

        const customHandler = config.handler || defaultHandler;
        return customHandler(request, NextResponse.next()) as R;
      }

      // Increment counter
      entry.count++;

      // Add rate limit headers to response
      const response = await handler(request, ...args);
      
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Limit', config.limit.toString());
        response.headers.set('X-RateLimit-Remaining', Math.max(0, config.limit - entry.count).toString());
        response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      }

      // Log rate limit info
      apiLogger.debug('Rate limit check passed', {
        key,
        count: entry.count,
        limit: config.limit,
        remaining: config.limit - entry.count
      });

      return response;
    };
  };
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (request: NextRequest) => {
      const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
      return `auth_rate_limit:${ip}`;
    }
  },

  // Moderate rate limiting for API endpoints
  api: {
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (request: NextRequest) => {
      const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
      return `api_rate_limit:${ip}`;
    }
  },

  // User-specific rate limiting
  user: {
    limit: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: NextRequest) => {
      // Extract user ID from request (you'll need to implement this based on your auth)
      const userId = request.headers.get('x-user-id') || 'anonymous';
      return `user_rate_limit:${userId}`;
    }
  },

  // AI/LLM specific rate limiting
  ai: {
    limit: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id') || 'anonymous';
      return `ai_rate_limit:${userId}`;
    }
  },

  // File upload rate limiting
  upload: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id') || 'anonymous';
      return `upload_rate_limit:${userId}`;
    }
  }
};

// Utility function to get client IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || 
         realIP || 
         cfConnectingIP || 
         request.ip || 
         'unknown';
}

// Utility function to check if request should be rate limited
export function shouldRateLimit(request: NextRequest): boolean {
  // Skip rate limiting for health checks
  if (request.nextUrl.pathname === '/api/health') {
    return false;
  }

  // Skip rate limiting for static assets
  if (request.nextUrl.pathname.startsWith('/_next/') || 
      request.nextUrl.pathname.startsWith('/static/')) {
    return false;
  }

  return true;
}

// Enhanced rate limit handler with custom response
export function createRateLimitHandler(
  message: string = 'Rate limit exceeded',
  retryAfterSeconds: number = 60
) {
  return (request: NextRequest): NextResponse => {
    const retryAfter = Math.ceil(retryAfterSeconds);
    
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        message,
        retryAfter,
        timestamp: new Date().toISOString()
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
        }
      }
    );
  };
}

// Export types
export type RateLimitHandler = (request: NextRequest) => NextResponse;
export type RateLimitKeyGenerator = (request: NextRequest) => string; 