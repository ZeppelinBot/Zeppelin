import { PluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { ReactionRole } from "src/data/entities/ReactionRole";
import { TextChannel } from "eris";
import { isDiscordRESTError, sleep, isSnowflake } from "src/utils";
import { logger } from "src/logger";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";

const CLEAR_ROLES_EMOJI = "❌";

export async function applyReactionRoleReactionsToMessage(
  pluginData: PluginData<ReactionRolesPluginType>,
  channelId: string,
  messageId: string,
  reactionRoles: ReactionRole[],
) {
  const channel = pluginData.guild.channels.get(channelId) as TextChannel;
  if (!channel) return;

  let targetMessage;
  try {
    targetMessage = await channel.getMessage(messageId);
  } catch (e) {
    if (isDiscordRESTError(e)) {
      if (e.code === 10008) {
        // Unknown message, remove reaction roles from the message
        logger.warn(
          `Removed reaction roles from unknown message ${channelId}/${messageId} in guild ${pluginData.guild.name} (${pluginData.guild.id})`,
        );
        await pluginData.state.reactionRoles.removeFromMessage(messageId);
      } else {
        logger.warn(
          `Error when applying reaction roles to message ${channelId}/${messageId} in guild ${pluginData.guild.name} (${pluginData.guild.id}), error code ${e.code}`,
        );
      }

      return;
    } else {
      throw e;
    }
  }

  // Remove old reactions, if any
  await targetMessage.removeReactions();
  await sleep(1500);

  // Add reaction role reactions
  for (const rr of reactionRoles) {
    const emoji = isSnowflake(rr.emoji) ? `foo:${rr.emoji}` : rr.emoji;

    try {
      await targetMessage.addReaction(emoji);
      await sleep(1250); // Make sure we don't hit rate limits
    } catch (e) {
      if (isDiscordRESTError(e) && e.code === 10014) {
        pluginData.state.reactionRoles.removeFromMessage(messageId, rr.emoji);
        const logs = pluginData.getPlugin(LogsPlugin);
        logs.log(LogType.BOT_ALERT, {
          body: `Could not add unknown reaction role emoji ${emoji} to message ${channelId}/${messageId}`,
        });
        continue;
      }

      throw e;
    }
  }

  // Add the "clear reactions" button
  await targetMessage.addReaction(CLEAR_ROLES_EMOJI);
}
