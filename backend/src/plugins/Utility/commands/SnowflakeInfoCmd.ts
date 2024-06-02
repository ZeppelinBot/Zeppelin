import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed.js";
import { utilityCmd } from "../types.js";

export const SnowflakeInfoCmd = utilityCmd({
  trigger: ["snowflake", "snowflakeinfo"],
  description: "Show information about a snowflake ID",
  usage: "!snowflake 534722016549404673",
  permission: "can_snowflake",

  signature: {
    id: ct.anyId(),
  },

  async run({ message, args }) {
    const embed = await getSnowflakeInfoEmbed(args.id, false);
    message.channel.send({ embeds: [embed] });
  },
});
