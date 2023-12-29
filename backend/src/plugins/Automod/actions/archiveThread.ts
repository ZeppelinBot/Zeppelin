import { AnyThreadChannel } from "discord.js";
import * as t from "io-ts";
import { noop } from "../../../utils";
import { automodAction } from "../helpers";

export const ArchiveThreadAction = automodAction({
  configType: t.type({}),
  defaultConfig: {},

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
