import { autoReactionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canUseEmoji, customEmojiRegex, isEmoji } from "src/utils";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { Constants, GuildChannel } from "eris";
import { readChannelPermissions } from "../../../utils/readChannelPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";

const requiredPermissions = readChannelPermissions | Constants.Permissions.addReactions;

export const NewAutoReactionsCmd = autoReactionsCmd({
  trigger: "auto_reactions",
  permission: "can_manage",
  usage: "!auto_reactions 629990160477585428 👍 👎",

  signature: {
    channel: ct.channel(),
    reactions: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const finalReactions = [];

    const me = pluginData.guild.members.get(pluginData.client.user.id);
    const missingPermissions = getMissingChannelPermissions(me, args.channel as GuildChannel, requiredPermissions);
    if (missingPermissions) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `Cannot set auto-reactions for that channel. ${missingPermissionError(missingPermissions)}`,
      );
      return;
    }

    for (const reaction of args.reactions) {
      if (!isEmoji(reaction)) {
        sendErrorMessage(pluginData, msg.channel, "One or more of the specified reactions were invalid!");
        return;
      }

      let savedValue;

      const customEmojiMatch = reaction.match(customEmojiRegex);
      if (customEmojiMatch) {
        // Custom emoji
        if (!canUseEmoji(pluginData.client, customEmojiMatch[2])) {
          sendErrorMessage(pluginData, msg.channel, "I can only use regular emojis and custom emojis from this server");
          return;
        }

        savedValue = `${customEmojiMatch[1]}:${customEmojiMatch[2]}`;
      } else {
        // Unicode emoji
        savedValue = reaction;
      }

      finalReactions.push(savedValue);
    }

    await pluginData.state.autoReactions.set(args.channel.id, finalReactions);
    sendSuccessMessage(pluginData, msg.channel, `Auto-reactions set for <#${args.channel.id}>`);
  },
});
