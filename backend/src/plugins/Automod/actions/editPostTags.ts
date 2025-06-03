import { AnyThreadChannel } from "discord.js";
import z from "zod";
import { zSnowflake } from "../../../utils.js";
import { automodAction } from "../helpers.js";

export const EditPostTagsAction = automodAction({
  configSchema: z.strictObject({
    tags: z.array(zSnowflake),
    append: z.boolean().optional(),
    delete: z.boolean().optional(),
  }),

  async apply({ pluginData, contexts, actionConfig }) {
    const threads = contexts
      .filter((c) => c.message?.channel_id)
      .map((c) => pluginData.guild.channels.cache.get(c.message!.channel_id))
      .filter((c): c is AnyThreadChannel => (c?.isThread() && c?.parent?.isThreadOnly() && c?.editable) ?? false);

    const tags: string[] = actionConfig.tags;
    for (const thread of threads) {
      const finalTags = actionConfig.append
        ? thread.appliedTags.concat(tags)
        : actionConfig.delete
        ? thread.appliedTags.filter((id) => !tags.includes(id))
        : tags;
      await thread.setAppliedTags(finalTags);
    }
  },
});
