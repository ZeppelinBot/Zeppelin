import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { sendErrorMessage } from "../../../pluginUtils.js";
import { getCustomEmojiId } from "../functions/getCustomEmojiId.js";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed.js";
import { utilityCmd } from "../types.js";

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
