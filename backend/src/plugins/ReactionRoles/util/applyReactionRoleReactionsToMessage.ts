import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { ReactionRole } from "../../../data/entities/ReactionRole";
import { isDiscordAPIError, sleep } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ReactionRolesPluginType } from "../types";

const CLEAR_ROLES_EMOJI = "❌";

/**
 * @return Errors encountered while applying reaction roles, if any
 */
export async function applyReactionRoleReactionsToMessage(
  pluginData: GuildPluginData<ReactionRolesPluginType>,
  channelId: string,
  messageId: string,
  reactionRoles: ReactionRole[],
): Promise<string[] | undefined> {
  const channel = pluginData.guild.channels.cache.get(channelId as Snowflake) as TextChannel;
  if (!channel) return;

  const errors: string[] = [];
  const logs = pluginData.getPlugin(LogsPlugin);

  let targetMessage;
  try {
    targetMessage = await channel.messages.fetch(messageId, { force: true });
  } catch (e) {
    if (isDiscordAPIError(e)) {
      if (e.code === 10008) {
        // Unknown message, remove reaction roles from the message
        logs.logBotAlert({
          body: `Removed reaction roles from unknown message ${channelId}/${messageId} (${pluginData.guild.id})`,
        });
        await pluginData.state.reactionRoles.removeFromMessage(messageId);
      } else {
        logs.logBotAlert({
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
    await targetMessage.reactions.removeAll();
  } catch (e) {
    if (isDiscordAPIError(e)) {
      errors.push(`Error ${e.code} while removing old reactions: ${e.message}`);
      logs.logBotAlert({
        body: `Error ${e.code} while removing old reaction role reactions from message ${channelId}/${messageId}: ${e.message}`,
      });
      return errors;
    }

    throw e;
  }

  await sleep(1500);

  // Add reaction role reactions
  const emojisToAdd = reactionRoles.map((rr) => rr.emoji);
  emojisToAdd.push(CLEAR_ROLES_EMOJI);

  for (const rawEmoji of emojisToAdd) {
    try {
      await targetMessage.react(rawEmoji);
      await sleep(750); // Make sure we don't hit rate limits
    } catch (e) {
      if (isDiscordAPIError(e)) {
        if (e.code === 10014) {
          pluginData.state.reactionRoles.removeFromMessage(messageId, rawEmoji);
          errors.push(`Unknown emoji: ${rawEmoji}`);
          logs.logBotAlert({
            body: `Could not add unknown reaction role emoji ${rawEmoji} to message ${channelId}/${messageId}`,
          });
          continue;
        } else if (e.code === 50013) {
          errors.push(`Missing permissions to apply reactions`);
          logs.logBotAlert({
            body: `Error ${e.code} while applying reaction role reactions to ${channelId}/${messageId}: ${e.message}`,
          });
          break;
        }
      }

      throw e;
    }
  }

  return errors;
}
