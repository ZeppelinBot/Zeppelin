import { automodTrigger } from "../helpers";
import * as t from "io-ts";
import fetch from "node-fetch";
import { fromBuffer } from "file-type";
import { asSingleLine, disableInlineCode, messageSummary, verboseChannelMention } from "src/utils";

interface MatchResultType {
  matchedType: string;
  mode: "blacklist" | "whitelist";
}

export const MatchMimeTypeTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    mimetype_blacklist: t.array(t.string),
    blacklist_enabled: t.boolean,
    mimetype_whitelist: t.array(t.string),
    whitelist_enabled: t.boolean,
  }),

  defaultConfig: {
    mimetype_blacklist: [],
    blacklist_enabled: false,
    mimetype_whitelist: [],
    whitelist_enabled: false,
  },

  async match({ context, triggerConfig: trigger }) {
    if (!context.message) return;

    const { attachments } = context.message.data;
    if (!attachments) return null;

    for (const attachment of attachments) {
      const res = await fetch(attachment.proxyURL);
      const mimeType = await fromBuffer(await res.buffer());
      if (!mimeType) return;

      const blacklist = trigger.blacklist_enabled
        ? (trigger.mimetype_blacklist || []).map(_t => _t.toLowerCase())
        : null;

      if (blacklist?.includes(mimeType.mime)) {
        return {
          extra: {
            matchedType: mimeType.mime,
            mode: "blacklist",
          },
        };
      }

      const whitelist = trigger.whitelist_enabled
        ? (trigger.mimetype_whitelist || []).map(_t => _t.toLowerCase())
        : null;

      if (whitelist?.includes(mimeType.mime)) {
        return {
          extra: {
            matchedType: mimeType.mime,
            mode: "whitelist",
          },
        };
      }

      return null;
    }
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const [context] = contexts;
    const { message } = context;
    if (!message) return;
    const channel = pluginData.guild.channels.cache.get(message.channel_id);
    const prettyChannel = verboseChannelMention(channel);
    const { matchedType, mode } = matchResult.extra;

    return (
      asSingleLine(`
        Matched MIME type \`${disableInlineCode(matchedType)}\`
        (${mode === "blacklist" ? "(blacklisted)" : "(not in whitelist)"})
        in message (\`${message.id}\`) in ${prettyChannel}
      `) + messageSummary(message)
    );
  },
});
