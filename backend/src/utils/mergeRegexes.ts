import { categorize } from "./categorize";

const hasBackreference = /(?:^|[^\\]|[\\]{2})\\\d+/;

export function mergeRegexes(sourceRegexes: RegExp[], flags: string): RegExp[] {
  const categories = categorize(sourceRegexes, {
    hasBackreferences: (regex) => hasBackreference.exec(regex.source) !== null,
    safeToMerge: () => true,
  });
  const regexes: RegExp[] = [];
  if (categories.safeToMerge.length) {
    const merged = categories.safeToMerge.map((r) => `(?:${r.source})`).join("|");
    regexes.push(new RegExp(merged, flags));
  }
  regexes.push(...categories.hasBackreferences);
  return regexes;
}
