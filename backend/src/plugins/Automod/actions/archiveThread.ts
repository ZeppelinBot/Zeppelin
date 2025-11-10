import { AnyThreadChannel } from "discord.js";
import { z } from "zod";
import { noop } from "../../../utils.js";
import { automodAction } from "../helpers.js";

const configSchema = z.strictObject({});

export const ArchiveThreadAction = automodAction({
  configSchema,

  async apply({ pluginData, contexts }) {
    const threads = contexts
      .filter((c) => c.message?.channel_id)
      .map((c) => pluginData.guild.channels.cache.get(c.message!.channel_id))
      .filter((c): c is AnyThreadChannel => c?.isThread() ?? false);

    for (const thread of threads) {
      await thread.setArchived().catch(noop);
    }
  },
});
