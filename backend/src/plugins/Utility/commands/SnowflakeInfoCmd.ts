import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed";

export const SnowflakeInfoCmd = utilityCmd({
  trigger: ["snowflake", "snowflakeinfo"],
  description: "Show information about a snowflake ID",
  usage: "!snowflake 534722016549404673",
  permission: "can_snowflake",

  signature: {
    id: ct.anyId(),
  },

  run({ message, args, pluginData }) {
    const embed = getSnowflakeInfoEmbed(pluginData, args.id);
    message.channel.createMessage({ embed });
  },
});
