import { BaseGuildTextChannel, Channel, GuildChannel, NewsChannel, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { StarboardMessage } from "../../../data/entities/StarboardMessage";
import { noop } from "../../../utils";
import { StarboardPluginType } from "../types";

export async function removeMessageFromStarboard(
  pluginData: GuildPluginData<StarboardPluginType>,
  msg: StarboardMessage,
) {
  // fixes stuck entries on starboard_reactions table after messages being deleted, probably should add a cleanup script for this as well, i.e. DELETE FROM starboard_reactions WHERE message_id NOT IN (SELECT id FROM starboard_messages)
  await pluginData.state.starboardReactions.deleteAllStarboardReactionsForMessageId(msg.message_id).catch(noop);

  // just re-do the deletion, i know this isnt clean but i dont care
  const channel: Channel | undefined = pluginData.client.channels.cache.find(
    chan => chan.id === msg.starboard_channel_id,
  );
  if (!channel?.isText()) return;
  const message = await channel.messages.fetch(msg.starboard_message_id).catch(noop);
  if (!message?.deletable) return;
  await message.delete().catch(noop);
}
