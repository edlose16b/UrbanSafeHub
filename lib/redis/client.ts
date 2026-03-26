import "server-only";

import { Redis } from "@upstash/redis";

let redisClient: Redis | null | undefined;
let missingConfigLogged = false;

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!missingConfigLogged) {
      console.warn("Upstash Redis is not configured. Cache will be bypassed.");
      missingConfigLogged = true;
    }

    return null;
  }

  return new Redis({
    url,
    token,
  });
}

export function getRedisClient(): Redis | null {
  if (redisClient === undefined) {
    redisClient = createRedisClient();
  }

  return redisClient;
}
