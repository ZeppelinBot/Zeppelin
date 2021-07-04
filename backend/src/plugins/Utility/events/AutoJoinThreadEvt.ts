import { utilityEvt } from "../types";

export const AutoJoinThreadEvt = utilityEvt({
  event: "threadCreate",

  async listener(meta) {
    const config = meta.pluginData.config.get();
    if (config.autojoin_threads && meta.args.thread.joinable && !meta.args.thread.joined) {
      await meta.args.thread.join();
    }
  },
});
