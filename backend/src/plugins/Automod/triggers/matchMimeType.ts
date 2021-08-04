import { automodTrigger } from "../helpers";
import * as t from "io-ts";
import fetch from "node-fetch";
import { fromBuffer } from "file-type";
import { asSingleLine, messageSummary, verboseChannelMention } from "src/utils";
import { Snowflake, TextChannel, Util } from "discord.js";

interface MatchResultType {
  matchedType: string;
  mode: "blacklist" | "whitelist";
}

export const MatchMimeTypeTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    mime_type_blacklist: t.array(t.string),
    blacklist_enabled: t.boolean,
    mime_type_whitelist: t.array(t.string),
    whitelist_enabled: t.boolean,
  }),

  defaultConfig: {
    mime_type_blacklist: [],
    blacklist_enabled: false,
    mime_type_whitelist: [],
    whitelist_enabled: false,
  },

  async match({ context, triggerConfig: trigger }) {
    if (!context.message) return;

    const { attachments } = context.message.data;
    if (!attachments) return null;

    for (const attachment of attachments) {
      const res = await fetch(attachment.url);
      const mimeType = await fromBuffer(await res.buffer());

      const blacklist = trigger.blacklist_enabled
        ? (trigger.mime_type_blacklist || []).map(_t => _t.toLowerCase())
        : null;

      if (mimeType && blacklist?.includes(mimeType.mime)) {
        return {
          extra: {
            matchedType: mimeType.mime,
            mode: "blacklist",
          },
        };
      }

      const whitelist = trigger.whitelist_enabled
        ? (trigger.mime_type_whitelist || []).map(_t => _t.toLowerCase())
        : null;

      if (whitelist && (!mimeType || !whitelist.includes(mimeType.mime))) {
        return {
          extra: {
            matchedType: mimeType?.mime || "unknown",
            mode: "whitelist",
          },
        };
      }

      return null;
    }
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const { message } = contexts[0];
    const channel = pluginData.guild.channels.cache.get(message!.channel_id as Snowflake) as TextChannel;
    const prettyChannel = verboseChannelMention(channel);
    const { matchedType, mode } = matchResult.extra;

    return (
      asSingleLine(`
        Matched MIME type \`${Util.escapeInlineCode(matchedType)}\`
        (${mode === "blacklist" ? "blacklisted" : "not in whitelist"})
        in message (\`${message!.id}\`) in ${prettyChannel}
      `) + messageSummary(message!)
    );
  },
});
