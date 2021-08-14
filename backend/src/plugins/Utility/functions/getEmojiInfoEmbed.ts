import { MessageEmbedOptions } from "discord.js";
import { GuildPluginData } from "knub";
import { EmbedWith, preEmbedPadding, trimLines } from "../../../utils";
import { UtilityPluginType } from "../types";

export async function getEmojiInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  emojiId: string,
): Promise<MessageEmbedOptions | null> {
  const emoji = pluginData.guild.emojis.cache.find(e => e.id === emojiId);
  if (!emoji) {
    return null;
  }

  const embed: EmbedWith<"fields"> = {
    fields: [],
  };

  embed.author = {
    name: `Emoji:  ${emoji.name}`,
    icon_url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?v=1`,
  };

  embed.fields.push({
    name: preEmbedPadding + "Emoji information",
    value: trimLines(`
      Name: **${emoji.name}**
      ID: \`${emoji.id}\`
      Animated: **${emoji.animated ? "Yes" : "No"}**
    `),
  });

  return embed;
}
