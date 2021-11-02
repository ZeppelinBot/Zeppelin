import { Request, Response } from "express";
import { error } from "./responses";

const lastRequestsByKey: Map<string, number> = new Map();

export function rateLimit(getKey: (req: Request) => string, limitMs: number, message = "Rate limited") {
  return async (req: Request, res: Response, next) => {
    const key = getKey(req);
    if (lastRequestsByKey.has(key)) {
      if (lastRequestsByKey.get(key)! > Date.now() - limitMs) {
        return error(res, message, 429);
      }
    }

    lastRequestsByKey.set(key, Date.now());
    next();
  };
}
