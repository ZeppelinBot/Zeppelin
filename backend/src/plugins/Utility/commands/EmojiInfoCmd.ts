import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { customEmojiRegex } from "../../../utils";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed";

export const EmojiInfoCmd = utilityCmd({
  trigger: ["emoji", "emojiinfo"],
  description: "Show information about an emoji",
  usage: "!emoji 106391128718245888",
  permission: "can_emojiinfo",

  signature: {
    emoji: ct.string({ required: false }),
  },

  async run({ message, args, pluginData }) {
    const emojiIdMatch = args.emoji.match(customEmojiRegex);
    if (!emojiIdMatch?.[2]) {
      sendErrorMessage(pluginData, message.channel, "Emoji not found");
      return;
    }

    const embed = await getEmojiInfoEmbed(pluginData, emojiIdMatch[2]);
    if (!embed) {
      sendErrorMessage(pluginData, message.channel, "Emoji not found");
      return;
    }

    message.channel.createMessage({ embed });
  },
});
