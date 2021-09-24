import { RateLimitData } from "discord.js";

type RateLimitLogItem = {
  timestamp: number;
  data: RateLimitData;
};

const rateLimitLog: RateLimitLogItem[] = [];

const MAX_RATE_LIMIT_LOG_ITEMS = 100;

export function logRateLimit(data: RateLimitData) {
  rateLimitLog.push({
    timestamp: Date.now(),
    data,
  });
  if (rateLimitLog.length > MAX_RATE_LIMIT_LOG_ITEMS) {
    rateLimitLog.splice(0, rateLimitLog.length - MAX_RATE_LIMIT_LOG_ITEMS);
  }
}

export function getRateLimitStats(): RateLimitLogItem[] {
  return Array.from(rateLimitLog);
}
