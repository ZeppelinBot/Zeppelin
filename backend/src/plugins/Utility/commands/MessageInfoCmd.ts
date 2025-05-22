import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveMessageMember } from "../../../pluginUtils.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed.js";
import { utilityCmd } from "../types.js";

export const MessageInfoCmd = utilityCmd({
  trigger: ["message", "messageinfo"],
  description: "Show information about a message",
  usage: "!message 534722016549404673-534722219696455701",
  permission: "can_messageinfo",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message, args, pluginData }) {
    const messageMember = await resolveMessageMember(message);
    if (!canReadChannel(args.message.channel, messageMember)) {
      void pluginData.state.common.sendErrorMessage(message, "Unknown message");
      return;
    }

    const embed = await getMessageInfoEmbed(pluginData, args.message.channel.id, args.message.messageId);
    if (!embed) {
      void pluginData.state.common.sendErrorMessage(message, "Unknown message");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
