import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { noop } from "../../../utils";

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
          console.warn(`Message ID to delete was already present: ${pluginData.guild.name}, rule ${ruleName}`);
          continue;
        }

        messageIdsToDeleteByChannelId.get(context.message.channel_id)!.push(context.message.id);
      }
    }

    for (const [channelId, messageIds] of messageIdsToDeleteByChannelId.entries()) {
      for (const id of messageIds) {
        pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id);
      }

      await pluginData.client.deleteMessages(channelId, messageIds).catch(noop);
    }
  },
});
