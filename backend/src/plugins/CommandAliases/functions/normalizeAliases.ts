export interface NormalizedAlias {
  alias: string;
  target: string;
}

export function normalizeAliases(aliases: Record<string, string> | undefined | null): NormalizedAlias[] {
  if (!aliases) {
    return [];
  }

  const normalized: NormalizedAlias[] = [];
  for (const [rawAlias, rawTarget] of Object.entries(aliases)) {
    const alias = rawAlias.trim();
    const target = rawTarget.trim();

    if (!alias || !target) {
      continue;
    }

    normalized.push({
      alias,
      target,
    });
  }

  return normalized;
}
