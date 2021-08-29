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
