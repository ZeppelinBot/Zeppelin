import { EmbedField } from "discord.js";
import { chunkMessageLines, emptyEmbedValue } from "../utils";

export function getChunkedEmbedFields(name: string, value: string, inline?: boolean): EmbedField[] {
  const fields: EmbedField[] = [];

  const chunks = chunkMessageLines(value, 1014);
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      fields.push({
        name,
        value: chunks[i],
        inline: false,
      });
    } else {
      fields.push({
        name: emptyEmbedValue,
        value: chunks[i],
        inline: false,
      });
    }
  }

  return fields;
}
