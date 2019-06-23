import { Response } from "express";

export function unauthorized(res: Response) {
  res.status(403).json({ error: "Unauthorized" });
}

export function clientError(res: Response, message: string) {
  res.status(400).json({ error: message });
}

export function ok(res: Response) {
  res.json({ result: "ok" });
}
