import { PluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { ReactionRole } from "src/data/entities/ReactionRole";
import { TextChannel } from "eris";
import { isDiscordRESTError, sleep, isSnowflake } from "src/utils";
import { logger } from "src/logger";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";

const CLEAR_ROLES_EMOJI = "❌";

/**
 * @return Errors encountered while applying reaction roles, if any
 */
export async function applyReactionRoleReactionsToMessage(
  pluginData: PluginData<ReactionRolesPluginType>,
  channelId: string,
  messageId: string,
  reactionRoles: ReactionRole[],
): Promise<string[]> {
  const channel = pluginData.guild.channels.get(channelId) as TextChannel;
  if (!channel) return;

  const errors = [];
  const logs = pluginData.getPlugin(LogsPlugin);

  let targetMessage;
  try {
    targetMessage = await channel.getMessage(messageId);
  } catch (e) {
    if (isDiscordRESTError(e)) {
      if (e.code === 10008) {
        // Unknown message, remove reaction roles from the message
        logs.log(LogType.BOT_ALERT, {
          body: `Removed reaction roles from unknown message ${channelId}/${messageId} (${pluginData.guild.id})`,
        });
        await pluginData.state.reactionRoles.removeFromMessage(messageId);
      } else {
        logs.log(LogType.BOT_ALERT, {
          body: `Error ${e.code} when applying reaction roles to message ${channelId}/${messageId}: ${e.message}`,
        });
      }

      errors.push(`Error ${e.code} while fetching reaction role message: ${e.message}`);
      return errors;
    } else {
      throw e;
    }
  }

  // Remove old reactions, if any
  try {
    await targetMessage.removeReactions();
  } catch (e) {
    if (isDiscordRESTError(e)) {
      errors.push(`Error ${e.code} while removing old reactions: ${e.message}`);
      logs.log(LogType.BOT_ALERT, {
        body: `Error ${e.code} while removing old reaction role reactions from message ${channelId}/${messageId}: ${e.message}`,
      });
      return errors;
    }

    throw e;
  }

  await sleep(1500);

  // Add reaction role reactions
  for (const rr of reactionRoles) {
    const emoji = isSnowflake(rr.emoji) ? `foo:${rr.emoji}` : rr.emoji;

    try {
      await targetMessage.addReaction(emoji);
      await sleep(1250); // Make sure we don't hit rate limits
    } catch (e) {
      if (isDiscordRESTError(e)) {
        if (e.code === 10014) {
          pluginData.state.reactionRoles.removeFromMessage(messageId, rr.emoji);
          errors.push(`Unknown emoji: ${emoji}`);
          logs.log(LogType.BOT_ALERT, {
            body: `Could not add unknown reaction role emoji ${emoji} to message ${channelId}/${messageId}`,
          });
          continue;
        } else if (e.code === 50013) {
          errors.push(`Missing permissions to apply reactions`);
          logs.log(LogType.BOT_ALERT, {
            body: `Error ${e.code} while applying reaction role reactions to ${channelId}/${messageId}: ${e.message}`,
          });
          break;
        }
      }

      throw e;
    }
  }

  // Add the "clear reactions" button
  await targetMessage.addReaction(CLEAR_ROLES_EMOJI);

  return errors;
}
