import escapeStringRegexp from "escape-string-regexp";

export function mergeWordsIntoRegex(words: string[], flags?: string) {
  const source = words.map((word) => `(?:${escapeStringRegexp(word)})`).join("|");
  return new RegExp(source, flags);
}
