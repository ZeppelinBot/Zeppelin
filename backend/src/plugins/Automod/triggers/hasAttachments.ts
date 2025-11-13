import { Snowflake } from "discord.js";
import z from "zod";
import { asSingleLine, messageSummary, verboseChannelMention } from "../../../utils.js";
import { automodTrigger } from "../helpers.js";

interface HasAttachmentsMatchResult {
  hasAttachments: boolean;
  attachmentCount: number;
}

const configSchema = z.strictObject({
  has: z.boolean(),
});

export const HasAttachmentsTrigger = automodTrigger<HasAttachmentsMatchResult>()({
  configSchema,

  async match({ context, triggerConfig }) {
    if (!context.message) {
      return;
    }

    const attachments = context.message.data.attachments;
    const attachmentCount = attachments?.length ?? 0;
    const hasAttachments = attachmentCount > 0;

    if (hasAttachments === triggerConfig.has) {
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
