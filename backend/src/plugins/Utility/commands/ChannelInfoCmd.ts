import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed";
import { utilityCmd } from "../types";

export const ChannelInfoCmd = utilityCmd({
  trigger: ["channel", "channelinfo"],
  description: "Show information about a channel",
  usage: "!channel 534722016549404673",
  permission: "can_channelinfo",

  signature: {
    channel: ct.channelId({ required: false }),
  },

  async run({ message, args, pluginData }) {
    const embed = await getChannelInfoEmbed(pluginData, args.channel);
    if (!embed) {
      sendErrorMessage(pluginData, message.channel, "Unknown channel");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
