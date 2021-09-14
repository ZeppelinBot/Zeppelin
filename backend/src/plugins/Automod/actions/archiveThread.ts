import { ThreadChannel } from "discord.js";
import * as t from "io-ts";
import { noop, tNullable } from "../../../utils";
import { automodAction } from "../helpers";

export const ArchiveThreadAction = automodAction({
  configType: t.type({
    lock: tNullable(t.boolean),
  }),
  defaultConfig: {
    lock: false,
  },

  async apply({ pluginData, contexts, actionConfig }) {
    const threads = contexts
      .filter((c) => c.thread?.id)
      .map((c) => pluginData.guild.channels.cache.get(c.thread!.id))
      .filter((c): c is ThreadChannel => c?.isThread() ?? false);

    for (const thread of threads) {
      if (actionConfig.lock && !thread.locked) {
        await thread.setLocked().catch(noop);
      }
      if (thread.archived) continue;
      await thread.setArchived().catch(noop);
    }
  },
});
