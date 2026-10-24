import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const UPLOAD_LIMIT_PER_MINUTE = 20;
const QUERY_LIMIT_PER_MINUTE = 60;

const uploadBuckets = new Map<string, RateLimitBucket>();
const queryBuckets = new Map<string, RateLimitBucket>();

function checkBucket(bucketMap: Map<string, RateLimitBucket>, key: string, maxTokens: number, refillRatePerSec: number): boolean {
  const now = Date.now();
  let bucket = bucketMap.get(key);

  if (!bucket) {
    bucket = { tokens: maxTokens - 1, lastRefill: now };
    bucketMap.set(key, bucket);
    return true;
  }

  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSec * refillRatePerSec);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

// User Context Middleware: Extracts or assigns secure user ID
export function userContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  let userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
  
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    userId = 'user_default';
  }

  // Sanitize user ID (alphanumeric and underscore/dash only)
  userId = userId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40) || 'user_default';
  (req as any).userId = userId;
  next();
}

// Upload Rate Limiter
export function uploadRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientKey = `${(req as any).userId || 'anonymous'}_${req.ip}`;
  const allowed = checkBucket(uploadBuckets, clientKey, UPLOAD_LIMIT_PER_MINUTE, UPLOAD_LIMIT_PER_MINUTE / 60);

  if (!allowed) {
    res.status(429).json({
      error: 'Upload rate limit exceeded. Please wait a minute before uploading additional documents.',
    });
    return;
  }
  next();
}

// Query Rate Limiter
export function queryRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientKey = `${(req as any).userId || 'anonymous'}_${req.ip}`;
  const allowed = checkBucket(queryBuckets, clientKey, QUERY_LIMIT_PER_MINUTE, QUERY_LIMIT_PER_MINUTE / 60);

  if (!allowed) {
    res.status(429).json({
      error: 'Query rate limit exceeded. Please wait a moment before sending another query.',
    });
    return;
  }
  next();
}

// Sanitize user input text
export function sanitizeInputText(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Strip null bytes, control characters (except newline and tab)
  return input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 200000); // 200k char limit per single prompt
}
