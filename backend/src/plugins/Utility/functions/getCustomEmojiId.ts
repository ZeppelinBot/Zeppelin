const customEmojiRegex = /(?:<a?:[a-z0-9_]{2,32}:)?([1-9]\d+)>?/i;

export function getCustomEmojiId(str: string): string | null {
  const emojiIdMatch = str.match(customEmojiRegex);
  return emojiIdMatch?.[1] ?? null;
}
