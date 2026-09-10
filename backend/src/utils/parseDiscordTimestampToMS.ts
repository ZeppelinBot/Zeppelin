export function parseDiscordTimestampToMS(str: string): number | null {
  const match = str.match(/^<t:(\d+)(?::[tTdDfFsSR])?>$/);
  if (!match) {
    return null;
  }

  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp)) {
    return null;
  }

  return timestamp * 1000;
}
