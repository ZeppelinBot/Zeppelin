import { typedGuildEventListener } from "knub";
import { RecentActionType } from "../constants";
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
      thread,
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

export const RunAutomodOnThreadDelete = typedGuildEventListener<AutomodPluginType>()({
  event: "threadDelete",
  async listener({ pluginData, args: { thread } }) {
    const user = thread.ownerId
      ? await pluginData.client.users.fetch(thread.ownerId).catch(() => undefined)
      : undefined;

    const context: AutomodContext = {
      timestamp: Date.now(),
      thread,
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

export const RunAutomodOnThreadUpdate = typedGuildEventListener<AutomodPluginType>()({
  event: "threadUpdate",
  async listener({ pluginData, args: { oldThread, newThread: thread } }) {
    const user = thread.ownerId ? await pluginData.client.users.fetch(thread.ownerId).catch(() => void 0) : void 0;
    const changes: AutomodContext["threadChange"] = {};
    if (oldThread.archived !== thread.archived) {
      changes.archived = thread.archived ? thread : void 0;
      changes.unarchived = !thread.archived ? thread : void 0;
    }
    if (oldThread.locked !== thread.locked) {
      changes.locked = thread.locked ? thread : void 0;
      changes.unlocked = !thread.locked ? thread : void 0;
    }

    if (Object.keys(changes).length === 0) return;

    const context: AutomodContext = {
      timestamp: Date.now(),
      threadChange: changes,
      thread,
      user,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
});
