import { Message, GuildTextableChannel, EmbedOptions } from "eris";
import { PluginData } from "knub";
import { UtilityPluginType } from "../types";
import { UnknownUser, trimLines, embedPadding, resolveMember, resolveUser, preEmbedPadding } from "src/utils";
import moment from "moment-timezone";
import { CaseTypes } from "src/data/CaseTypes";
import humanizeDuration from "humanize-duration";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp";

const SNOWFLAKE_ICON = "https://cdn.discordapp.com/attachments/740650744830623756/742020790471491668/snowflake.png";

export function getSnowflakeInfoEmbed(
  pluginData: PluginData<UtilityPluginType>,
  snowflake: string,
  showUnknownWarning = false,
): EmbedOptions {
  const embed: EmbedOptions = {
    fields: [],
  };

  embed.author = {
    name: `Snowflake:  ${snowflake}`,
    icon_url: SNOWFLAKE_ICON,
  };

  if (showUnknownWarning) {
    embed.description =
      "This is a valid [snowflake ID](https://discord.com/developers/docs/reference#snowflakes), but I don't know what it's for.";
  }

  const createdAtMS = snowflakeToTimestamp(snowflake);
  const createdAt = moment(createdAtMS, "x");
  const snowflakeAge = humanizeDuration(Date.now() - createdAtMS, {
    largest: 2,
    round: true,
  });

  embed.fields.push({
    name: preEmbedPadding + "Basic information",
    value: `Created: **${snowflakeAge} ago** (\`${createdAt.format("MMM D, YYYY [at] H:mm [UTC]")}\`)`,
  });

  return embed;
}
