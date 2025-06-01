import { ZodIssue } from "zod/v4";

export function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.join("/");
  return `${path}: ${issue.message}`;
}
