import { starboardEvt } from "../types";
import { Message, TextChannel } from "eris";
import { UnknownUser, resolveMember, noop, resolveUser } from "../../../utils";
import { saveMessageToStarboard } from "../util/saveMessageToStarboard";
import { updateStarboardMessageStarCount } from "../util/updateStarboardMessageStarCount";
import { allStarboardsLock } from "../../../utils/lockNameHelpers";

export const StarboardReactionAddEvt = starboardEvt({
  event: "messageReactionAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;

    let msg = meta.args.message as Message;
    const userId = meta.args.member.id;
    const emoji = meta.args.emoji;

    if (!msg.author) {
      // Message is not cached, fetch it
      try {
        msg = await msg.channel.getMessage(msg.id);
      } catch {
        // Sometimes we get this event for messages we can't fetch with getMessage; ignore silently
        return;
      }
    }

    // No self-votes!
    if (msg.author.id === userId) return;

    const member = await resolveMember(pluginData.client, pluginData.guild, userId);
    if (!member || member.bot) return;

    const config = pluginData.config.getMatchingConfig({
      member,
      channelId: msg.channel.id,
      categoryId: (msg.channel as TextChannel).parentID,
    });

    const boardLock = await pluginData.locks.acquire(allStarboardsLock());

    const applicableStarboards = Object.values(config.boards)
      .filter(board => board.enabled)
      // Can't star messages in the starboard channel itself
      .filter(board => board.channel_id !== msg.channel.id)
      // Matching emoji
      .filter(board => {
        return board.star_emoji!.some((boardEmoji: string) => {
          if (emoji.id) {
            // Custom emoji
            const customEmojiMatch = boardEmoji.match(/^<?:.+?:(\d+)>?$/);
            if (customEmojiMatch) {
              return customEmojiMatch[1] === emoji.id;
            }

            return boardEmoji === emoji.id;
          } else {
            // Unicode emoji
            return emoji.name === boardEmoji;
          }
        });
      });

    for (const starboard of applicableStarboards) {
      // Save reaction into the database
      await pluginData.state.starboardReactions.createStarboardReaction(msg.id, userId).catch(noop);

      const reactions = await pluginData.state.starboardReactions.getAllReactionsForMessageId(msg.id);
      const reactionsCount = reactions.length;

      const starboardMessages = await pluginData.state.starboardMessages.getMatchingStarboardMessages(
        starboard.channel_id,
        msg.id,
      );
      if (starboardMessages.length > 0) {
        // If the message has already been posted to this starboard, update star counts
        if (starboard.show_star_count) {
          for (const starboardMessage of starboardMessages) {
            const realStarboardMessage = await pluginData.client.getMessage(
              starboardMessage.starboard_channel_id,
              starboardMessage.starboard_message_id,
            );
            await updateStarboardMessageStarCount(
              starboard,
              msg,
              realStarboardMessage,
              starboard.star_emoji![0]!,
              reactionsCount,
            );
          }
        }
      } else if (reactionsCount >= starboard.stars_required) {
        // Otherwise, if the star count exceeds the required star count, save the message to the starboard
        await saveMessageToStarboard(pluginData, msg, starboard);
      }
    }

    boardLock.unlock();
  },
});
