import escapeStringRegexp from "escape-string-regexp";
import { NormalizedAlias } from "./normalizeAliases.js";

export interface AliasMatcher {
  regex: RegExp;
  replacement: string;
}

export function buildAliasMatchers(prefix: string, aliases: NormalizedAlias[]): AliasMatcher[] {
  return aliases.map((alias) => {
    const pattern = `^${escapeStringRegexp(prefix)}${escapeStringRegexp(alias.alias)}\\b`;
    return {
      regex: new RegExp(pattern, "i"),
      replacement: `${prefix}${alias.target}`,
    };
  });
}
