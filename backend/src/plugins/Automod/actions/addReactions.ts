import { Snowflake } from "discord.js";
import { z } from "zod";
import { noop } from "../../../utils.js";
import { automodAction } from "../helpers.js";

const configSchema = z.array(z.string())

export const AddReactionsAction = automodAction({
  configSchema,

  async apply({ pluginData, contexts, actionConfig }) {
    const messageIdsByChannel = new Map<string, Set<string>>();

    for (const context of contexts) {
      if (context.message) {
        if (!messageIdsByChannel.has(context.message.channel_id)) {
          messageIdsByChannel.set(context.message.channel_id, new Set<string>());
        }
        messageIdsByChannel.get(context.message.channel_id)!.add(context.message.id);
      }
    }

    for (const [channelId, messageIds] of messageIdsByChannel.entries()) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake)
      if (!channel?.isTextBased?.()) continue;

      for (const messageId of messageIds) {
        const msg = await channel.messages.fetch(messageId).catch(noop);
        if (!msg) continue;

        for (const emoji of actionConfig) {
          await msg.react(emoji).catch(noop);
        }
      }
    }
  },
});
