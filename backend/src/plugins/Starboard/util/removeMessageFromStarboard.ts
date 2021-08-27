import { BaseGuildTextChannel } from "discord.js";
import { StarboardMessage } from "../../../data/entities/StarboardMessage";
import { noop } from "../../../utils";

export async function removeMessageFromStarboard(pluginData, msg: StarboardMessage) {
  // fixes stuck entries on starboard_reactions table after messages being deleted, probably should add a cleanup script for this as well, i.e. DELETE FROM starboard_reactions WHERE message_id NOT IN (SELECT id FROM starboard_messages)
  await pluginData.state.starboardReactions.deleteAllStarboardReactionsForMessageId(msg.message_id).catch(noop);

  // just re-do the deletion, i know this isnt clean but i dont care
  const channel: BaseGuildTextChannel = await pluginData.client.channels.cache.find(
    chan => chan.id === msg.starboard_channel_id,
  );
  if (!channel || (channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS")) return;
  const message = await channel.messages.fetch(msg.starboard_message_id);
  if (!message || !message.deletable) return;
  await message.delete().catch(noop);
}
