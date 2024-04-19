import { escapeInlineCode, Snowflake } from "discord.js";
import { extname } from "path";
import z from "zod";
import { asSingleLine, messageSummary, verboseChannelMention } from "../../../utils";
import { automodTrigger } from "../helpers";

interface MatchResultType {
  matchedType: string;
  mode: "blacklist" | "whitelist";
}

const configSchema = z
  .strictObject({
    filetype_blacklist: z.array(z.string().max(32)).max(255).default([]),
    blacklist_enabled: z.boolean().default(false),
    filetype_whitelist: z.array(z.string().max(32)).max(255).default([]),
    whitelist_enabled: z.boolean().default(false),
  })
  .transform((parsed, ctx) => {
    if (parsed.blacklist_enabled && parsed.whitelist_enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot have both blacklist and whitelist enabled",
      });
      return z.NEVER;
    }
    if (!parsed.blacklist_enabled && !parsed.whitelist_enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must have either blacklist or whitelist enabled",
      });
      return z.NEVER;
    }
    return parsed;
  });

export const MatchAttachmentTypeTrigger = automodTrigger<MatchResultType>()({
  configSchema,

  async match({ context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    if (!context.message.data.attachments) {
      return null;
    }

    for (const attachment of context.message.data.attachments) {
      const attachmentType = extname(new URL(attachment.url).pathname).slice(1).toLowerCase();

      const blacklist = trigger.blacklist_enabled
        ? (trigger.filetype_blacklist || []).map((_t) => _t.toLowerCase())
        : null;

      if (blacklist && blacklist.includes(attachmentType)) {
        return {
          extra: {
            matchedType: attachmentType,
            mode: "blacklist",
          },
        };
      }

      const whitelist = trigger.whitelist_enabled
        ? (trigger.filetype_whitelist || []).map((_t) => _t.toLowerCase())
        : null;

      if (whitelist && !whitelist.includes(attachmentType)) {
        return {
          extra: {
            matchedType: attachmentType,
            mode: "whitelist",
          },
        };
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const channel = pluginData.guild.channels.cache.get(contexts[0].message!.channel_id as Snowflake)!;
    const prettyChannel = verboseChannelMention(channel);

    return (
      asSingleLine(`
        Matched attachment type \`${escapeInlineCode(matchResult.extra.matchedType)}\`
        (${matchResult.extra.mode === "blacklist" ? "blacklisted" : "not in whitelist"})
        in message (\`${contexts[0].message!.id}\`) in ${prettyChannel}:
      `) + messageSummary(contexts[0].message!)
    );
  },
});
