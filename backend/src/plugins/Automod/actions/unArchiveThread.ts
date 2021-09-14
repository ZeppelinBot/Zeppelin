import { ThreadChannel } from "discord.js";
import * as t from "io-ts";
import { noop, tNullable } from "../../../utils";
import { automodAction } from "../helpers";

export const UnArchiveThreadAction = automodAction({
  configType: t.type({
    unlock: tNullable(t.boolean),
  }),
  defaultConfig: {
    unlock: false,
  },

  async apply({ pluginData, contexts, actionConfig }) {
    const threads = contexts
      .filter((c) => c.thread?.id)
      .map((c) => pluginData.guild.channels.cache.get(c.thread!.id))
      .filter((c): c is ThreadChannel => c?.isThread() ?? false);

    for (const thread of threads) {
      if (actionConfig.unlock && thread.locked) {
        await thread.setLocked(false).catch(noop);
      }
      if (!thread.archived) continue;
      await thread.setArchived(false).catch(noop);
    }
  },
});
