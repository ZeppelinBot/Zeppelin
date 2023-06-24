import { APIEmbed } from "discord.js";
import { GuildPluginData } from "knub";
import { EmbedWith, preEmbedPadding } from "../../../utils";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp";
import { UtilityPluginType } from "../types";

const SNOWFLAKE_ICON = "https://cdn.discordapp.com/attachments/740650744830623756/742020790471491668/snowflake.png";

export async function getSnowflakeInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  snowflake: string,
  showUnknownWarning = false,
  requestMemberId?: string,
): Promise<APIEmbed> {
  const embed: EmbedWith<"fields" | "author"> = {
    fields: [],
    author: {
      name: `Snowflake:  ${snowflake}`,
      icon_url: SNOWFLAKE_ICON,
    },
  };

  if (showUnknownWarning) {
    embed.description =
      "This is a valid [snowflake ID](https://discord.com/developers/docs/reference#snowflakes), but I don't know what it's for.";
  }

  const createdAtMS = snowflakeToTimestamp(snowflake);

  embed.fields.push({
    name: preEmbedPadding + "Basic information",
    value: `Created: **<t:${Math.round(createdAtMS / 1000)}:R>**`,
  });

  return embed;
}
