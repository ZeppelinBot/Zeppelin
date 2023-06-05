import { APIEmbed } from "discord.js";
import { GuildPluginData } from "knub";
import { EmbedWith, preEmbedPadding, trimLines } from "../../../utils";
import { UtilityPluginType } from "../types";

export async function getEmojiInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  emojiId: string,
): Promise<APIEmbed | null> {
  const emoji = pluginData.guild.emojis.cache.find((e) => e.id === emojiId);
  if (!emoji) {
    return null;
  }

  const embed: EmbedWith<"fields" | "author"> = {
    fields: [],
    author: {
      name: `Emoji:  ${emoji.name}`,
      icon_url: emoji.url,
    },
  };

  embed.fields!.push({
    name: preEmbedPadding + "Emoji information",
    value: trimLines(`
      Name: **${emoji.name}**
      ID: \`${emoji.id}\`
      Animated: **${emoji.animated ? "Yes" : "No"}**
    `),
  });

  return embed;
}
