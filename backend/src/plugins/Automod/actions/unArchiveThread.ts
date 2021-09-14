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
      .filter((c) => c.message?.channel_id)
      .map((c) => pluginData.guild.channels.cache.get(c.message!.channel_id))
      .filter((c): c is ThreadChannel => (c?.isThread() && c.archived) ?? false);

    for (const thread of threads) {
      if (actionConfig.unlock) {
        await thread.setLocked(false).catch(noop);
      }
      await thread.setArchived(false).catch(noop);
    }
  },
});
