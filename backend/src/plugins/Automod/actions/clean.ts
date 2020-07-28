import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";

export const CleanAction = automodAction({
  configType: t.boolean,

  async apply({ pluginData, contexts }) {
    const messageIdsToDeleteByChannelId: Map<string, string[]> = new Map();
    for (const context of contexts) {
      if (context.message) {
        if (!messageIdsToDeleteByChannelId.has(context.message.channel_id)) {
          messageIdsToDeleteByChannelId.set(context.message.channel_id, []);
        }

        messageIdsToDeleteByChannelId.get(context.message.channel_id).push(context.message.id);
      }
    }

    for (const [channelId, messageIds] of messageIdsToDeleteByChannelId.entries()) {
      for (const id of messageIds) {
        pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id);
      }

      await pluginData.client.deleteMessages(channelId, messageIds);
    }
  },
});
