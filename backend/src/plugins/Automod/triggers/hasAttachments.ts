import { Snowflake } from "discord.js";
import z from "zod";
import { asSingleLine, messageSummary, verboseChannelMention } from "../../../utils.js";
import { automodTrigger } from "../helpers.js";

interface HasAttachmentsMatchResult {
  hasAttachments: boolean;
  attachmentCount: number;
}

const configSchema = z.strictObject({
  min_count: z.number().int().min(0).nullable().default(1),
  max_count: z.number().int().nullable().default(null),
});

export const HasAttachmentsTrigger = automodTrigger<HasAttachmentsMatchResult>()({
  configSchema,

  async match({ context, triggerConfig }) {
    if (!context.message) {
      return;
    }
    if (triggerConfig.min_count == null && triggerConfig.max_count == null) {
      return;
    }

    const attachments = context.message.data.attachments;
    const attachmentCount = attachments?.length ?? 0;
    const hasAttachments = attachmentCount > 0;
    const matchesMinCount = triggerConfig.min_count != null ? attachmentCount >= triggerConfig.min_count : true;
    const matchesMaxCount = triggerConfig.max_count != null ? attachmentCount <= triggerConfig.max_count : true;

    if (matchesMinCount && matchesMaxCount) {
      return {
        extra: {
          hasAttachments,
          attachmentCount,
        },
      };
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const message = contexts[0].message!;
    const channel = pluginData.guild.channels.cache.get(message.channel_id as Snowflake);
    const prettyChannel = channel ? verboseChannelMention(channel) : "Unknown Channel";
    const descriptor = matchResult.extra.hasAttachments ? "has" : "does not have";

    return (
      asSingleLine(`
        Matched message (\`${message.id}\`) that ${descriptor} attachments
        (${matchResult.extra.attachmentCount}) in ${prettyChannel}:
      `) + messageSummary(message)
    );
  },
});
