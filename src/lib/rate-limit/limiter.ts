import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${name}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${name}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export type RateLimitResult = { allowed: boolean };

// Sección 16 del blueprint: sliding window por endpoint. Si Upstash no está
// configurado, no bloquea (fail-open) para no dejar el sitio inutilizable
// durante desarrollo — antes de producción esto debe estar configurado
// (checklist, sección 19).
export async function checkRateLimit(
  name: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name, limit, windowSeconds);
  if (!limiter) {
    console.warn(`[rate-limit] Upstash no configurado — "${name}" no está protegido todavía.`);
    return { allowed: true };
  }
  const result = await limiter.limit(key);
  return { allowed: result.success };
}

// Vercel (y la mayoría de los hosts serios) setean x-forwarded-for con la IP
// real del cliente — headers() sí está disponible dentro de Server Actions.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
