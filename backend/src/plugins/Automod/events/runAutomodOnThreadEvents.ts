import { guildPluginEventListener } from "knub";
import { RecentActionType } from "../constants";
import { runAutomod } from "../functions/runAutomod";
import { AutomodContext, AutomodPluginType } from "../types";

export const RunAutomodOnThreadCreate = guildPluginEventListener<AutomodPluginType>()({
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

export const RunAutomodOnThreadDelete = guildPluginEventListener<AutomodPluginType>()({
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

export const RunAutomodOnThreadUpdate = guildPluginEventListener<AutomodPluginType>()({
  event: "threadUpdate",
  async listener({ pluginData, args: { oldThread, newThread: thread } }) {
    const user = thread.ownerId
      ? await pluginData.client.users.fetch(thread.ownerId).catch(() => undefined)
      : undefined;

    const changes: AutomodContext["threadChange"] = {};
    if (oldThread.archived !== thread.archived) {
      changes.archived = thread.archived ? thread : undefined;
      changes.unarchived = !thread.archived ? thread : undefined;
    }
    if (oldThread.locked !== thread.locked) {
      changes.locked = thread.locked ? thread : undefined;
      changes.unlocked = !thread.locked ? thread : undefined;
    }

    if (Object.keys(changes).length === 0) return;

    const context: AutomodContext = {
      timestamp: Date.now(),
      threadChange: changes,
      user,
      channel: thread,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
});
