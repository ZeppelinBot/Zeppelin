import { APIEmbed, EmbedData } from "discord.js";

function sumStringLengthsRecursively(obj: any): number {
  if (obj == null) return 0;
  if (typeof obj === "string") return obj.length;
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + sumStringLengthsRecursively(item), 0);
  }
  if (typeof obj === "object") {
    return Array.from(Object.values(obj)).reduce((sum: number, item) => sum + sumStringLengthsRecursively(item), 0);
  }
  return 0;
}

export function calculateEmbedSize(embed: APIEmbed | EmbedData): number {
  return sumStringLengthsRecursively(embed);
}
