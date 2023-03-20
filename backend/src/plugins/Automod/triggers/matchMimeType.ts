import { escapeInlineCode } from "discord.js";
import * as t from "io-ts";
import { asSingleLine, messageSummary, verboseChannelMention } from "../../../utils";
import { automodTrigger } from "../helpers";

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
      const { contentType: rawContentType } = attachment;
      const contentType = (rawContentType || "").split(";")[0]; // Remove "; charset=utf8" and similar from the end

      const blacklist = trigger.blacklist_enabled
        ? (trigger.mime_type_blacklist ?? []).map((_t) => _t.toLowerCase())
        : null;

      if (contentType && blacklist?.includes(contentType)) {
        return {
          extra: {
            matchedType: contentType,
            mode: "blacklist",
          },
        };
      }

      const whitelist = trigger.whitelist_enabled
        ? (trigger.mime_type_whitelist ?? []).map((_t) => _t.toLowerCase())
        : null;

      if (whitelist && (!contentType || !whitelist.includes(contentType))) {
        return {
          extra: {
            matchedType: contentType || "<unknown>",
            mode: "whitelist",
          },
        };
      }

      return null;
    }
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const { message } = contexts[0];
    const channel = pluginData.guild.channels.resolve(message!.channel_id)!;
    const prettyChannel = verboseChannelMention(channel);
    const { matchedType, mode } = matchResult.extra;

    return (
      asSingleLine(`
        Matched MIME type \`${escapeInlineCode(matchedType)}\`
        (${mode === "blacklist" ? "blacklisted" : "not in whitelist"})
        in message (\`${message!.id}\`) in ${prettyChannel}
      `) + messageSummary(message!)
    );
  },
});
