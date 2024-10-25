import { PublicThreadChannel } from "discord.js";
import z from "zod";
import { zSnowflake } from "../../../utils.js";
import { automodAction } from "../helpers.js";

export const EditPostTagsAction = automodAction({
  configSchema: z.strictObject({
    tags: z.array(zSnowflake),
  }),

  async apply({ pluginData, contexts, actionConfig }) {
    const threads = contexts
      .filter((c) => c.message?.channel_id)
      .map((c) => pluginData.guild.channels.cache.get(c.message!.channel_id))
      .filter((c): c is PublicThreadChannel => (c?.isThread() && c?.parent?.isThreadOnly() && c?.editable) ?? false);

    for (const thread of threads) {
      await thread.setAppliedTags(actionConfig.tags);
    }
  },
});
