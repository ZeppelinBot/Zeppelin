import { PluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { ReactionRole } from "src/data/entities/ReactionRole";
import { TextChannel } from "eris";
import { isDiscordRESTError, sleep, isSnowflake } from "src/utils";
import { logger } from "src/logger";

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
  const removeSleep = sleep(1250);
  await targetMessage.removeReactions();
  await removeSleep;

  // Add reaction role reactions
  for (const rr of reactionRoles) {
    const emoji = isSnowflake(rr.emoji) ? `foo:${rr.emoji}` : rr.emoji;

    const sleepTime = sleep(1250); // Make sure we only add 1 reaction per ~second so as not to hit rate limits
    await targetMessage.addReaction(emoji);
    await sleepTime;
  }

  // Add the "clear reactions" button
  await targetMessage.addReaction(CLEAR_ROLES_EMOJI);
}
