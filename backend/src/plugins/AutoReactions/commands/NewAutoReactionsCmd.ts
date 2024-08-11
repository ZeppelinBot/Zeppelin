import { PermissionsBitField } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canUseEmoji, customEmojiRegex, isEmoji } from "../../../utils.js";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions.js";
import { missingPermissionError } from "../../../utils/missingPermissionError.js";
import { readChannelPermissions } from "../../../utils/readChannelPermissions.js";
import { autoReactionsCmd } from "../types.js";

const requiredPermissions = readChannelPermissions | PermissionsBitField.Flags.AddReactions;

export const NewAutoReactionsCmd = autoReactionsCmd({
  trigger: "auto_reactions",
  permission: "can_manage",
  usage: "!auto_reactions 629990160477585428 👍 👎",

  signature: {
    channel: ct.guildTextBasedChannel(),
    reactions: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const finalReactions: string[] = [];

    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;
    const missingPermissions = getMissingChannelPermissions(me, args.channel, requiredPermissions);
    if (missingPermissions) {
      pluginData.state.common.sendErrorMessage(
        msg,
        `Cannot set auto-reactions for that channel. ${missingPermissionError(missingPermissions)}`,
      );
      return;
    }

    for (const reaction of args.reactions) {
      if (!isEmoji(reaction)) {
        void pluginData.state.common.sendErrorMessage(msg, "One or more of the specified reactions were invalid!");
        return;
      }

      let savedValue;

      const customEmojiMatch = reaction.match(customEmojiRegex);
      if (customEmojiMatch) {
        // Custom emoji
        if (!canUseEmoji(pluginData.client, customEmojiMatch[2])) {
          pluginData.state.common.sendErrorMessage(
            msg,
            "I can only use regular emojis and custom emojis from this server",
          );
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
    pluginData.state.cache.delete(args.channel.id);
    void pluginData.state.common.sendSuccessMessage(msg, `Auto-reactions set for <#${args.channel.id}>`);
  },
});
