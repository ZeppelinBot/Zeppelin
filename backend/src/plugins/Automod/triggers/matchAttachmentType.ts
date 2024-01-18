import { escapeInlineCode, Snowflake } from "discord.js";
import * as t from "io-ts";
import { extname } from "path";
import { asSingleLine, messageSummary, verboseChannelMention } from "../../../utils";
import { automodTrigger } from "../helpers";

interface MatchResultType {
  matchedType: string;
  mode: "blacklist" | "whitelist";
}

export const MatchAttachmentTypeTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    filetype_blacklist: t.array(t.string),
    blacklist_enabled: t.boolean,
    filetype_whitelist: t.array(t.string),
    whitelist_enabled: t.boolean,
  }),

  defaultConfig: {
    filetype_blacklist: [],
    blacklist_enabled: false,
    filetype_whitelist: [],
    whitelist_enabled: false,
  },

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
