import { ChannelType } from "discord.js";
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

  // this code is now Almeida-certified and no longer ugly :ok_hand: :cake:
  const channel = pluginData.client.channels.cache.find((c) => c.id === msg.starboard_channel_id);
  if (channel?.type !== ChannelType.GuildText) return;
  const message = await channel.messages.fetch(msg.starboard_message_id).catch(noop);
  if (!message?.deletable) return;
  await message.delete().catch(noop);
}
