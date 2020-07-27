import * as t from "io-ts";
import { transliterate } from "transliteration";
import escapeStringRegexp from "escape-string-regexp";
import { AnyInvite, Attachment, GuildInvite } from "eris";
import { automodTrigger } from "../helpers";
import {
  asSingleLine,
  disableCodeBlocks,
  disableInlineCode,
  getInviteCodesInString,
  isGuildInvite,
  resolveInvite,
  tNullable,
  verboseChannelMention,
} from "../../../utils";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";

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

    if (!context.message.data.attachments) return null;
    const attachments: any[] = context.message.data.attachments;

    for (const attachment of attachments) {
      const attachmentType = attachment.filename.split(`.`).pop();

      if (trigger.blacklist_enabled && trigger.filetype_blacklist.includes(attachmentType)) {
        return {
          extra: {
            matchedType: attachmentType,
            mode: "blacklist",
          },
        };
      }

      if (trigger.whitelist_enabled && !trigger.filetype_whitelist.includes(attachmentType)) {
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
    const channel = pluginData.guild.channels.get(contexts[0].message.channel_id);
    const prettyChannel = verboseChannelMention(channel);

    return (
      asSingleLine(`
        Matched attachment type \`${disableInlineCode(matchResult.extra.matchedType)}\`
        (${matchResult.extra.mode === "blacklist" ? "(blacklisted)" : "(not in whitelist)"})
        in message (\`${contexts[0].message.id}\`) in ${prettyChannel}:
      `) +
      "\n```" +
      disableCodeBlocks(contexts[0].message.data.content) +
      "```"
    );
  },
});
