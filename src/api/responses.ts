import { Response } from "express";

export function unauthorized(res: Response) {
  res.status(403).json({ error: "Unauthorized" });
}

export function error(res: Response, message: string, statusCode: number = 500) {
  res.status(statusCode).json({ error: message });
}

export function serverError(res: Response, message = "Server error") {
  error(res, message, 500);
}

export function clientError(res: Response, message: string) {
  error(res, message, 400);
}

export function notFound(res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function ok(res: Response) {
  res.json({ result: "ok" });
}
