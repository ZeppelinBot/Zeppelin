import { EmbedOptions } from "eris";
import { GuildPluginData } from "knub";
import { UtilityPluginType } from "../types";
import { trimLines, preEmbedPadding, EmbedWith } from "../../../utils";

export async function getEmojiInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  emojiId: string,
): Promise<EmbedOptions | null> {
  const emoji = pluginData.guild.emojis.find(e => e.id === emojiId);
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
