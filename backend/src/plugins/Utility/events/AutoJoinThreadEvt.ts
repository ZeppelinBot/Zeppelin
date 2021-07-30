import { utilityEvt } from "../types";

export const AutoJoinThreadEvt = utilityEvt({
  event: "threadCreate",

  async listener(meta) {
    const config = meta.pluginData.config.get();
    if (config.autojoin_threads && meta.args.thread.joinable) {
      await meta.args.thread.join();
    }
  },
});

export const AutoJoinThreadSyncEvt = utilityEvt({
  event: "threadListSync",

  async listener(meta) {
    const config = meta.pluginData.config.get();
    if (!config.autojoin_threads) return;
    for (const thread of meta.args.threads.values()) {
      if (!thread.joined && thread.joinable) {
        await thread.join();
      }
    }
  },
});
