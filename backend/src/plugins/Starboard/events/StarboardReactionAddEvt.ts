import { Message, Snowflake, TextChannel } from "discord.js";
import { noop, resolveMember } from "../../../utils";
import { allStarboardsLock } from "../../../utils/lockNameHelpers";
import { starboardEvt } from "../types";
import { saveMessageToStarboard } from "../util/saveMessageToStarboard";
import { updateStarboardMessageStarCount } from "../util/updateStarboardMessageStarCount";

export const StarboardReactionAddEvt = starboardEvt({
  event: "messageReactionAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;

    let msg = meta.args.reaction.message as Message;
    const userId = meta.args.user.id;
    const emoji = meta.args.reaction.emoji;

    if (!msg.author) {
      // Message is not cached, fetch it
      try {
        msg = await msg.channel.messages.fetch(msg.id);
      } catch {
        // Sometimes we get this event for messages we can't fetch with getMessage; ignore silently
        return;
      }
    }

    const member = await resolveMember(pluginData.client, pluginData.guild, userId);
    if (!member || member.user.bot) return;

    const config = await pluginData.config.getMatchingConfig({
      member,
      channelId: msg.channel.id,
      categoryId: (msg.channel as TextChannel).parentId,
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

    const selfStar = msg.author.id === userId;
    for (const starboard of applicableStarboards) {
      if (selfStar && !starboard.allow_selfstars) continue;

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
            const channel = pluginData.guild.channels.cache.get(
              starboardMessage.starboard_channel_id as Snowflake,
            ) as TextChannel;
            const realStarboardMessage = await channel.messages.fetch(
              starboardMessage.starboard_message_id as Snowflake,
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
