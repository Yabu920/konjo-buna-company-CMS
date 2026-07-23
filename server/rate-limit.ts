import type { Request, RequestHandler } from 'express';

type RateEntry = { count: number; resetAt: number };

export class BoundedMemoryRateLimiter {
  private readonly entries = new Map<string, RateEntry>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly windowMs: number,
    private readonly maximum: number,
    private readonly maxEntries: number,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), Math.min(windowMs, 60_000));
    this.cleanupTimer.unref();
  }

  consume(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + this.windowMs }
      : current;
    entry.count += 1;

    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      this.cleanup(now);
      while (this.entries.size >= this.maxEntries) {
        const oldest = this.entries.keys().next().value as string | undefined;
        if (!oldest) break;
        this.entries.delete(oldest);
      }
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return {
      allowed: entry.count <= this.maximum,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private cleanup(now = Date.now()): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimitMiddleware(limiter: BoundedMemoryRateLimiter, message: string): RequestHandler {
  return (req, res, next) => {
    const result = limiter.consume(clientIp(req));
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}
