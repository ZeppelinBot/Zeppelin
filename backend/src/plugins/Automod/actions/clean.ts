import { Snowflake, TextChannel } from "discord.js";
import * as t from "io-ts";
import { LogType } from "../../../data/LogType";
import { noop } from "../../../utils";
import { automodAction } from "../helpers";

const cleanDebugServer = process.env.TEMP_CLEAN_DEBUG_SERVER;

export const CleanAction = automodAction({
  configType: t.boolean,
  defaultConfig: false,

  async apply({ pluginData, contexts, ruleName }) {
    const messageIdsToDeleteByChannelId: Map<string, string[]> = new Map();
    for (const context of contexts) {
      if (context.message) {
        if (!messageIdsToDeleteByChannelId.has(context.message.channel_id)) {
          messageIdsToDeleteByChannelId.set(context.message.channel_id, []);
        }

        if (messageIdsToDeleteByChannelId.get(context.message.channel_id)!.includes(context.message.id)) {
          // FIXME: Debug
          // tslint:disable-next-line:no-console
          console.warn(`Message ID to delete was already present: ${pluginData.guild.name}, rule ${ruleName}`);
          continue;
        }

        messageIdsToDeleteByChannelId.get(context.message.channel_id)!.push(context.message.id);
      }
    }

    if (pluginData.guild.id === cleanDebugServer) {
      const toDeleteFormatted = Array.from(messageIdsToDeleteByChannelId.entries())
        .map(([channelId, messageIds]) => `- ${channelId}: ${messageIds.join(", ")}`)
        .join("\n");
      // tslint:disable-next-line:no-console
      console.log(`[DEBUG] Cleaning messages (${ruleName}):\n${toDeleteFormatted}`);
    }

    for (const [channelId, messageIds] of messageIdsToDeleteByChannelId.entries()) {
      for (const id of messageIds) {
        pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id);
      }

      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake) as TextChannel;
      await channel.bulkDelete(messageIds as Snowflake[]).catch((err) => {
        if (pluginData.guild.id === cleanDebugServer) {
          // tslint:disable-next-line:no-console
          console.error(`[DEBUG] Failed to bulk delete messages (${ruleName}): ${err}`);
        }
      });
    }
  },
});
