import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { canReadChannel } from "../../../utils/canReadChannel";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed";
import { utilityCmd } from "../types";

export const MessageInfoCmd = utilityCmd({
  trigger: ["message", "messageinfo"],
  description: "Show information about a message",
  usage: "!message 534722016549404673-534722219696455701",
  permission: "can_messageinfo",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message, args, pluginData }) {
    if (!canReadChannel(args.message.channel, message.member)) {
      sendErrorMessage(pluginData, message.channel, "Unknown message");
      return;
    }

    const embed = await getMessageInfoEmbed(
      pluginData,
      args.message.channel.id,
      args.message.messageId,
      message.author.id,
    );
    if (!embed) {
      sendErrorMessage(pluginData, message.channel, "Unknown message");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
