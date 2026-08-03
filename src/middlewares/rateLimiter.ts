import { Request, Response, NextFunction } from 'express';

interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  refillIntervalMs: number;
}

interface BucketState {
  tokens: number;
  lastRefillTime: number;
}

// Global store for all rate limiters
// Key structure: `${limiterName}:${identifier}`
const store = new Map<string, BucketState>();

// Optional: Prevent memory leaks by periodically clearing the store
setInterval(() => {
  store.clear();
}, 1000 * 60 * 60); // Clear every hour

/**
 * Generalized Token Bucket Rate Limiter Middleware
 * 
 * @param name A unique name for this limiter instance to isolate its buckets
 * @param config Capacity, refill rate, and refill interval
 */
export const rateLimiter = (name: string, config: TokenBucketConfig) => {
  const { capacity, refillRate, refillIntervalMs } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Use user ID if authenticated, fallback to IP address
    const identifier = (req as any).user?.id || req.ip || 'unknown';
    const key = `${name}:${identifier}`;

    const now = Date.now();
    let state = store.get(key);

    if (!state) {
      // Initialize new bucket
      state = {
        tokens: capacity,
        lastRefillTime: now,
      };
    } else {
      // Calculate refill
      const timePassed = now - state.lastRefillTime;
      if (timePassed >= refillIntervalMs) {
        const intervalsPassed = Math.floor(timePassed / refillIntervalMs);
        const tokensToAdd = intervalsPassed * refillRate;
        
        state.tokens = Math.min(capacity, state.tokens + tokensToAdd);
        state.lastRefillTime = now - (timePassed % refillIntervalMs);
      }
    }

    if (state.tokens >= 1) {
      // Consume 1 token and proceed
      state.tokens -= 1;
      store.set(key, state);
      
      // Set informative headers
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', state.tokens);
      
      next();
    } else {
      // Rate limited
      store.set(key, state);
      
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil(refillIntervalMs / 1000));
      
      res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        data: null
      });
    }
  };
};
