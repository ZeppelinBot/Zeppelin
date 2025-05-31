import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveMessageMember } from "../../../pluginUtils.js";
import { canUseEmoji, isDiscordAPIError, isValidEmoji, noop, trimPluginDescription } from "../../../utils.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { TReactionRolePair, reactionRolesCmd } from "../types.js";
import { applyReactionRoleReactionsToMessage } from "../util/applyReactionRoleReactionsToMessage.js";

const CLEAR_ROLES_EMOJI = "❌";

export const InitReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles",
  permission: "can_manage",
  description: trimPluginDescription(`
  This command allows you to add reaction roles to a given message.  
  The basic usage is as follows:  
    
  !reaction_roles 800865377520582687  
  👍 = 556110793058287637  
  👎 = 558037973581430785  
    
  A reactionRolePair is any emoji the bot can use, an equal sign and the role id it should correspond to.  
  Every pair needs to be in its own line for the command to work properly.  
  If the message you specify is not found, use \`!save_messages_to_db <channelId> <messageId>\`  
  to manually add it to the stored messages database permanently.
  `),

  signature: {
    message: ct.messageTarget(),
    reactionRolePairs: ct.string({ catchAll: true }),

    exclusive: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  },

  async run({ message: msg, args, pluginData }) {
    const member = await resolveMessageMember(msg);
    if (!canReadChannel(args.message.channel, member)) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        "You can't add reaction roles to channels you can't see yourself",
      );
      return;
    }

    let targetMessage;
    try {
      targetMessage = await args.message.channel.messages.fetch(args.message.messageId);
    } catch (e) {
      if (isDiscordAPIError(e)) {
        void pluginData.state.common.sendErrorMessage(msg, `Error ${e.code} while getting message: ${e.message}`);
        return;
      }

      throw e;
    }

    // Clear old reaction roles for the message from the DB
    await pluginData.state.reactionRoles.removeFromMessage(targetMessage.id);

    // Turn "emoji = role" pairs into an array of tuples of the form [emoji, roleId]
    // Emoji is either a unicode emoji or the snowflake of a custom emoji
    const emojiRolePairs: TReactionRolePair[] = args.reactionRolePairs
      .trim()
      .split("\n")
      .map((v) => v.split(/[\s=,]+/).map((v) => v.trim())) // tslint:disable-line
      .map((pair): TReactionRolePair => {
        const customEmojiMatch = pair[0].match(/^<a?:(.*?):(\d+)>$/);
        if (customEmojiMatch) {
          return [customEmojiMatch[2], pair[1], customEmojiMatch[1]];
        } else {
          return pair as TReactionRolePair;
        }
      });

    // Verify the specified emojis and roles are valid and usable
    for (const pair of emojiRolePairs) {
      if (pair[0] === CLEAR_ROLES_EMOJI) {
        void pluginData.state.common.sendErrorMessage(
          msg,
          `The emoji for clearing roles (${CLEAR_ROLES_EMOJI}) is reserved and cannot be used`,
        );
        return;
      }

      if (!isValidEmoji(pair[0])) {
        void pluginData.state.common.sendErrorMessage(msg, `Invalid emoji: ${pair[0]}`);
        return;
      }

      if (!canUseEmoji(pluginData.client, pair[0])) {
        void pluginData.state.common.sendErrorMessage(
          msg,
          "I can only use regular emojis and custom emojis from servers I'm on",
        );
        return;
      }

      if (!pluginData.guild.roles.cache.has(pair[1] as Snowflake)) {
        void pluginData.state.common.sendErrorMessage(msg, `Unknown role ${pair[1]}`);
        return;
      }
    }

    const progressMessage = msg.channel.send("Adding reaction roles...");

    // Save the new reaction roles to the database
    let pos = 0;
    for (const pair of emojiRolePairs) {
      await pluginData.state.reactionRoles.add(
        args.message.channel.id,
        targetMessage.id,
        pair[0],
        pair[1],
        args.exclusive,
        pos,
      );
      pos++;
    }

    // Apply the reactions themselves
    const reactionRoles = await pluginData.state.reactionRoles.getForMessage(targetMessage.id);
    const errors = await applyReactionRoleReactionsToMessage(
      pluginData,
      targetMessage.channel.id,
      targetMessage.id,
      reactionRoles,
    );

    if (errors?.length) {
      void pluginData.state.common.sendErrorMessage(msg, `Errors while adding reaction roles:\n${errors.join("\n")}`);
    } else {
      void pluginData.state.common.sendSuccessMessage(msg, "Reaction roles added");
    }

    (await progressMessage).delete().catch(noop);
  },
});
