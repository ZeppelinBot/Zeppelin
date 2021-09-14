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
      .filter((c) => c.message?.channel_id)
      .map((c) => pluginData.guild.channels.cache.get(c.message!.channel_id))
      .filter((c): c is ThreadChannel => (c?.isThread() && !c.archived) ?? false);

    for (const thread of threads) {
      if (actionConfig.lock) {
        await thread.setLocked().catch(noop);
      }
      await thread.setArchived().catch(noop);
    }
  },
});
