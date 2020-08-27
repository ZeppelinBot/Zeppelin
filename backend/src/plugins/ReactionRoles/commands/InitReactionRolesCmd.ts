import { reactionRolesCmd, TReactionRolePair } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { TextChannel } from "eris";
import { RecoverablePluginError, ERRORS } from "src/RecoverablePluginError";
import { canUseEmoji, noop } from "../../../utils";
import { applyReactionRoleReactionsToMessage } from "../util/applyReactionRoleReactionsToMessage";
import { canReadChannel } from "../../../utils/canReadChannel";

const CLEAR_ROLES_EMOJI = "❌";

export const InitReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles",
  permission: "can_manage",

  signature: {
    message: ct.messageTarget(),
    reactionRolePairs: ct.string({ catchAll: true }),

    exclusive: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  },

  async run({ message: msg, args, pluginData }) {
    if (!canReadChannel(args.message.channel, msg.member)) {
      sendErrorMessage(pluginData, msg.channel, "Unknown message");
      return;
    }

    const targetMessage = await args.message.channel.getMessage(args.message.messageId);
    if (!targetMessage) {
      sendErrorMessage(pluginData, msg.channel, "Unknown message (2)");
      return;
    }

    // Clear old reaction roles for the message from the DB
    await pluginData.state.reactionRoles.removeFromMessage(targetMessage.id);

    // Turn "emoji = role" pairs into an array of tuples of the form [emoji, roleId]
    // Emoji is either a unicode emoji or the snowflake of a custom emoji
    const emojiRolePairs: TReactionRolePair[] = args.reactionRolePairs
      .trim()
      .split("\n")
      .map(v => v.split(/[\s=,]+/).map(v => v.trim())) // tslint:disable-line
      .map(
        (pair): TReactionRolePair => {
          const customEmojiMatch = pair[0].match(/^<a?:(.*?):(\d+)>$/);
          if (customEmojiMatch) {
            return [customEmojiMatch[2], pair[1], customEmojiMatch[1]];
          } else {
            return pair as TReactionRolePair;
          }
        },
      );

    // Verify the specified emojis and roles are valid and usable
    for (const pair of emojiRolePairs) {
      if (pair[0] === CLEAR_ROLES_EMOJI) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `The emoji for clearing roles (${CLEAR_ROLES_EMOJI}) is reserved and cannot be used`,
        );
        return;
      }

      try {
        if (!canUseEmoji(pluginData.client, pair[0])) {
          sendErrorMessage(
            pluginData,
            msg.channel,
            "I can only use regular emojis and custom emojis from servers I'm on",
          );
          return;
        }
      } catch (e) {
        if (e instanceof RecoverablePluginError && e.code === ERRORS.INVALID_EMOJI) {
          sendErrorMessage(pluginData, msg.channel, `Invalid emoji: ${pair[0]}`);
          return;
        }

        throw e;
      }

      if (!pluginData.guild.roles.has(pair[1])) {
        sendErrorMessage(pluginData, msg.channel, `Unknown role ${pair[1]}`);
        return;
      }
    }

    const progressMessage = msg.channel.createMessage("Adding reaction roles...");

    // Save the new reaction roles to the database
    for (const pair of emojiRolePairs) {
      await pluginData.state.reactionRoles.add(
        args.message.channel.id,
        targetMessage.id,
        pair[0],
        pair[1],
        args.exclusive,
      );
    }

    // Apply the reactions themselves
    const reactionRoles = await pluginData.state.reactionRoles.getForMessage(targetMessage.id);
    const errors = await applyReactionRoleReactionsToMessage(
      pluginData,
      targetMessage.channel.id,
      targetMessage.id,
      reactionRoles,
    );

    if (errors.length) {
      sendErrorMessage(pluginData, msg.channel, `Errors while adding reaction roles:\n${errors.join("\n")}`);
    } else {
      sendSuccessMessage(pluginData, msg.channel, "Reaction roles added");
    }

    (await progressMessage).delete().catch(noop);
  },
});
