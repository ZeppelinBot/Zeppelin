import { Snowflake, TextChannel, Util } from "discord.js";
import * as t from "io-ts";
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

  async match({ pluginData, context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    if (!context.message.data.attachments) {
      return null;
    }

    for (const attachment of context.message.data.attachments) {
      const attachmentType = attachment.url.split(".").pop()!.toLowerCase();

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
    const channel = pluginData.guild.channels.cache.get(contexts[0].message!.channel_id as Snowflake) as TextChannel;
    const prettyChannel = verboseChannelMention(channel);

    return (
      asSingleLine(`
        Matched attachment type \`${Util.escapeInlineCode(matchResult.extra.matchedType)}\`
        (${matchResult.extra.mode === "blacklist" ? "blacklisted" : "not in whitelist"})
        in message (\`${contexts[0].message!.id}\`) in ${prettyChannel}:
      `) + messageSummary(contexts[0].message!)
    );
  },
});
