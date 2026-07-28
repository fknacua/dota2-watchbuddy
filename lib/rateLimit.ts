import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== "false";

const ratelimit =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(30, "10 m"),
        analytics: true,
        prefix: "dota-watchbuddy",
      })
    : undefined;

// No-ops (allows the request) when Upstash isn't configured — e.g. local dev
// without credentials — or when explicitly disabled via RATE_LIMIT_ENABLED=false,
// a kill switch for flipping enforcement off without touching credentials.
export async function checkRateLimit(identifier: string): Promise<boolean> {
  if (!ratelimit || !rateLimitEnabled) return true;
  const { success } = await ratelimit.limit(identifier);
  return success;
}
