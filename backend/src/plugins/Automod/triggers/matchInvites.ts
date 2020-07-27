import * as t from "io-ts";
import { transliterate } from "transliteration";
import escapeStringRegexp from "escape-string-regexp";
import { AnyInvite, GuildInvite } from "eris";
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
  type: MatchableTextType;
  code: string;
  invite?: GuildInvite;
}

export const MatchInvitesTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    include_guilds: tNullable(t.array(t.string)),
    exclude_guilds: tNullable(t.array(t.string)),
    include_invite_codes: tNullable(t.array(t.string)),
    exclude_invite_codes: tNullable(t.array(t.string)),
    allow_group_dm_invites: t.boolean,
    match_messages: t.boolean,
    match_embeds: t.boolean,
    match_visible_names: t.boolean,
    match_usernames: t.boolean,
    match_nicknames: t.boolean,
    match_custom_status: t.boolean,
  }),

  defaultConfig: {
    allow_group_dm_invites: false,
    match_messages: true,
    match_embeds: true,
    match_visible_names: false,
    match_usernames: false,
    match_nicknames: false,
    match_custom_status: false,
  },

  async match({ pluginData, context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    for await (const [type, str] of matchMultipleTextTypesOnMessage(pluginData, trigger, context.message)) {
      const inviteCodes = getInviteCodesInString(str);
      if (inviteCodes.length === 0) return null;

      const uniqueInviteCodes = Array.from(new Set(inviteCodes));

      for (const code of uniqueInviteCodes) {
        if (trigger.include_invite_codes && trigger.include_invite_codes.includes(code)) {
          return { extra: { type, code } };
        }
        if (trigger.exclude_invite_codes && !trigger.exclude_invite_codes.includes(code)) {
          return { extra: { type, code } };
        }
      }

      for (const code of uniqueInviteCodes) {
        const invite = await resolveInvite(pluginData.client, code);
        if (!invite || !isGuildInvite(invite)) return { code };

        if (trigger.include_guilds && trigger.include_guilds.includes(invite.guild.id)) {
          return { extra: { type, code, invite } };
        }
        if (trigger.exclude_guilds && !trigger.exclude_guilds.includes(invite.guild.id)) {
          return { extra: { type, code, invite } };
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const channel = pluginData.guild.channels.get(contexts[0].message.channel_id);
    const prettyChannel = verboseChannelMention(channel);

    let matchedText;

    if (matchResult.extra.invite) {
      const invite = matchResult.extra.invite as GuildInvite;
      matchedText = `invite code \`${matchResult.extra.code}\` (**${invite.guild.name}**, \`${invite.guild.id}\`)`;
    } else {
      matchedText = `invite code \`${matchResult.extra.code}\``;
    }

    return (
      `${matchedText} in message (\`${contexts[0].message.id}\`) in ${prettyChannel}:\n` +
      "```" +
      disableCodeBlocks(contexts[0].message.data.content) +
      "```"
    );
  },
});
