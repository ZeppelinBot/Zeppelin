import { typedGuildEventListener } from "knub";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";

export const RunAutomodOnThreadCreate = typedGuildEventListener<AutomodPluginType>()({
  event: "threadCreate",
  async listener({ pluginData, args: { thread } }) {
    const user = thread.ownerId ? await pluginData.client.users.fetch(thread.ownerId).catch(() => void 0) : void 0;
    const context: AutomodContext = {
      timestamp: Date.now(),
      threadChange: {
        created: thread,
      },
      user,
    };

    // This is a hack to make this trigger compatible with the reply action
    const sourceChannel = thread.parent ?? pluginData.client.channels.cache.find((c) => c.id === thread.parentId);
    if (sourceChannel?.isText()) {
      const sourceMessage = sourceChannel.messages.cache.find(
        (m) => m.thread?.id === thread.id || m.reference?.channelId === thread.id,
      );
      if (sourceMessage) {
        const savedMessage = pluginData.state.savedMessages.msgToSavedMessage(sourceMessage);
        savedMessage.channel_id = thread.id;
        context.message = savedMessage;
      }
    }

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
});

export const RunAutomodOnThreadDelete = typedGuildEventListener<AutomodPluginType>()({
  event: "threadDelete",
  async listener({ pluginData, args: { thread } }) {
    const user = thread.ownerId ? await pluginData.client.users.fetch(thread.ownerId).catch(() => void 0) : void 0;

    const context: AutomodContext = {
      timestamp: Date.now(),
      threadChange: {
        deleted: thread,
      },
      user,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
});
