import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getCustomEmojiId } from "../functions/getCustomEmojiId";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed";
import { utilityCmd } from "../types";

export const EmojiInfoCmd = utilityCmd({
  trigger: ["emoji", "emojiinfo"],
  description: "Show information about an emoji",
  usage: "!emoji 106391128718245888",
  permission: "can_emojiinfo",

  signature: {
    emoji: ct.string({ required: true }),
  },

  async run({ message, args, pluginData }) {
    const emojiId = getCustomEmojiId(args.emoji);
    if (!emojiId) {
      sendErrorMessage(pluginData, message.channel, "Emoji not found");
      return;
    }

    const embed = await getEmojiInfoEmbed(pluginData, emojiId);
    if (!embed) {
      sendErrorMessage(pluginData, message.channel, "Emoji not found");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
