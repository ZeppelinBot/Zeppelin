import { MessageEmbedOptions } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { EmbedWith, preEmbedPadding } from "../../../utils";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UtilityPluginType } from "../types";

const SNOWFLAKE_ICON = "https://cdn.discordapp.com/attachments/740650744830623756/742020790471491668/snowflake.png";

export async function getSnowflakeInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  snowflake: string,
  showUnknownWarning = false,
  requestMemberId?: string,
): Promise<MessageEmbedOptions> {
  const embed: EmbedWith<"fields"> = {
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

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const createdAtMS = snowflakeToTimestamp(snowflake);
  const createdAt = moment.utc(createdAtMS, "x");
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const snowflakeAge = humanizeDuration(Date.now() - createdAtMS, {
    largest: 2,
    round: true,
  });

  embed.fields.push({
    name: preEmbedPadding + "Basic information",
    value: `Created: **${snowflakeAge} ago** (\`${prettyCreatedAt}\`)`,
  });

  return embed;
}
