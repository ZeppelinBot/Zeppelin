import { ZodIssue } from "zod";

export function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.join("/");
  return `${path}: ${issue.message}`;
}
