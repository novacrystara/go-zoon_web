import fs from "fs/promises";
import path from "path";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

// Default limits: 5 submissions per 10 minutes (600 seconds)
const WINDOW_SECONDS = 600;
const MAX_REQUESTS = 5;

// Local fallback store
interface LocalBucket {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, LocalBucket>();
const RATE_LIMIT_FILE = path.join(process.cwd(), "data", "rate-limits.json");

/**
 * Distributed rate limiter via Upstash Redis REST API.
 * Compatible with serverless, Netlify, Vercel, and multi-instance container deployments.
 */
async function checkDistributedRedis(identifier: string): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // Redis not configured, fallback to local store
  }

  try {
    const key = `ratelimit:contact:${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    // Use Upstash REST pipeline for atomic execution
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, WINDOW_SECONDS, "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[RateLimit Warning] Upstash returned status ${response.status}. Using fallback.`);
      return null;
    }

    const results = await response.json();
    // Upstash pipeline returns: [{ result: 1 }, { result: 1 }, { result: 599 }]
    const currentCount = typeof results[0]?.result === "number" ? results[0].result : 1;
    const ttl = typeof results[2]?.result === "number" && results[2].result > 0 ? results[2].result : WINDOW_SECONDS;

    const remaining = Math.max(0, MAX_REQUESTS - currentCount);
    const reset = now + ttl;

    return {
      success: currentCount <= MAX_REQUESTS,
      limit: MAX_REQUESTS,
      remaining,
      reset,
    };
  } catch (err) {
    console.warn("[RateLimit Warning] Upstash Redis request error, falling back to local store:", err);
    return null;
  }
}

/**
 * Local persistent file & memory store fallback for development and single-instance servers.
 */
async function checkLocalStore(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  let bucket = memoryStore.get(identifier);

  // If memory bucket expired or missing, try loading from file
  if (!bucket || bucket.resetAt <= now) {
    try {
      const data = await fs.readFile(RATE_LIMIT_FILE, "utf-8");
      const diskBuckets: Record<string, LocalBucket> = JSON.parse(data);
      if (diskBuckets[identifier] && diskBuckets[identifier].resetAt > now) {
        bucket = diskBuckets[identifier];
      }
    } catch {
      // Ignore read errors
    }
  }

  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 1,
      resetAt: now + WINDOW_SECONDS * 1000,
    };
  } else {
    bucket.count += 1;
  }

  memoryStore.set(identifier, bucket);

  // Persist to disk asynchronously in non-blocking manner
  (async () => {
    try {
      const dir = path.dirname(RATE_LIMIT_FILE);
      await fs.mkdir(dir, { recursive: true });
      const record: Record<string, LocalBucket> = {};
      for (const [k, v] of memoryStore.entries()) {
        if (v.resetAt > now) {
          record[k] = v;
        }
      }
      await fs.writeFile(RATE_LIMIT_FILE, JSON.stringify(record), "utf-8");
    } catch {
      // Best-effort disk persistence
    }
  })();

  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);
  const resetSeconds = Math.ceil(bucket.resetAt / 1000);

  return {
    success: bucket.count <= MAX_REQUESTS,
    limit: MAX_REQUESTS,
    remaining,
    reset: resetSeconds,
  };
}

/**
 * Checks rate limits for a given IP or identifier.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const distributedResult = await checkDistributedRedis(identifier);
  if (distributedResult !== null) {
    return distributedResult;
  }
  return checkLocalStore(identifier);
}

