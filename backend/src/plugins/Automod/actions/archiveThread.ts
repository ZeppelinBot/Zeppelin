import { AnyThreadChannel } from "discord.js";
import z from "zod/v4";
import { noop } from "../../../utils.js";
import { automodAction } from "../helpers.js";

export const ArchiveThreadAction = automodAction({
  configSchema: z.strictObject({
    lock: z.boolean().optional(),
  }),

  async apply({ pluginData, contexts, actionConfig }) {
    const threads = contexts
      .filter((c) => c.message?.channel_id)
      .map((c) => pluginData.guild.channels.cache.get(c.message!.channel_id))
      .filter((c): c is AnyThreadChannel => c?.isThread() ?? false);

    for (const thread of threads) {
      actionConfig.lock ? await thread.setLocked().catch(noop) : null;
      await thread.setArchived().catch(noop);
    }
  },
});
