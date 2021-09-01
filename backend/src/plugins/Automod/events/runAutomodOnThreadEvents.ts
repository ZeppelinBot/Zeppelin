import { typedGuildEventListener } from "knub";
import { RecentActionType } from "../constants";
import { GuildSavedMessages } from "../../../data/GuildSavedMessages";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";

export const RunAutomodOnThreadCreate = typedGuildEventListener<AutomodPluginType>()({
  event: "threadCreate",
  async listener({ pluginData, args: { thread } }) {
    const user = thread.ownerId
      ? await pluginData.client.users.fetch(thread.ownerId).catch(() => undefined)
      : undefined;

    const context: AutomodContext = {
      timestamp: Date.now(),
      threadChange: {
        created: thread,
      },
      user,
      channel: thread,
    };

    // This is a hack to make this trigger compatible with the reply action
    const sourceChannel = thread.parent ?? pluginData.client.channels.cache.find((c) => c.id === thread.parentId);
    messageBlock: if (sourceChannel?.isText()) {
      const sourceMessage = sourceChannel.messages.cache.find(
        (m) => m.thread?.id === thread.id || m.reference?.channelId === thread.id,
      );
      if (sourceMessage) {
        const savedMessage = GuildSavedMessages.msgToSavedMessage(sourceMessage);
        savedMessage.channel_id = thread.id;
        context.message = savedMessage;
      }
    }

    pluginData.state.queue.add(() => {
      pluginData.state.recentActions.push({
        type: RecentActionType.ThreadCreate,
        context,
        count: 1,
        identifier: null,
      });

      runAutomod(pluginData, context);
    });
  },
});

export const RunAutomodOnThreadDelete = typedGuildEventListener<AutomodPluginType>()({
  event: "threadDelete",
  async listener({ pluginData, args: { thread } }) {
    const user = thread.ownerId
      ? await pluginData.client.users.fetch(thread.ownerId).catch(() => undefined)
      : undefined;

    const context: AutomodContext = {
      timestamp: Date.now(),
      threadChange: {
        deleted: thread,
      },
      user,
      channel: thread,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
});
