import * as t from "io-ts";
import { getInviteCodesInString, GuildInvite, isGuildInvite, resolveInvite, tNullable } from "../../../utils";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";
import { automodTrigger } from "../helpers";

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
    match_embeds: false,
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
      if (inviteCodes.length === 0) continue;

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
        if (!invite || !isGuildInvite(invite)) return { extra: { type, code } };

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
    let matchedText;

    if (matchResult.extra.invite) {
      const invite = matchResult.extra.invite as GuildInvite;
      matchedText = `invite code \`${matchResult.extra.code}\` (**${invite.guild.name}**, \`${invite.guild.id}\`)`;
    } else {
      matchedText = `invite code \`${matchResult.extra.code}\``;
    }

    const partialSummary = getTextMatchPartialSummary(pluginData, matchResult.extra.type, contexts[0]);
    return `Matched ${matchedText} in ${partialSummary}`;
  },
});
