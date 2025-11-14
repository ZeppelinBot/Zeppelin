import { z } from "zod";
import { getInviteCodesInString, GuildInvite, isGuildInvite, resolveInvite, zSnowflake } from "../../../utils.js";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary.js";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage.js";
import { automodTrigger } from "../helpers.js";

interface MatchResultType {
  type: MatchableTextType;
  code: string;
  invite?: GuildInvite;
}

const configSchema = z.strictObject({
  include_guilds: z.array(zSnowflake).max(255).optional(),
  exclude_guilds: z.array(zSnowflake).max(255).optional(),
  include_invite_codes: z.array(z.string().max(32)).max(255).optional(),
  exclude_invite_codes: z.array(z.string().max(32)).max(255).optional(),
  include_custom_invite_codes: z
    .array(z.string().max(32))
    .max(255)
    .transform((arr) => arr.map((str) => str.toLowerCase()))
    .optional(),
  exclude_custom_invite_codes: z
    .array(z.string().max(32))
    .max(255)
    .transform((arr) => arr.map((str) => str.toLowerCase()))
    .optional(),
  allow_group_dm_invites: z.boolean().default(false),
  match_messages: z.boolean().default(true),
  match_embeds: z.boolean().default(false),
  match_visible_names: z.boolean().default(false),
  match_usernames: z.boolean().default(false),
  match_nicknames: z.boolean().default(false),
  match_custom_status: z.boolean().default(false),
});

export const MatchInvitesTrigger = automodTrigger<MatchResultType>()({
  configSchema,

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
        if (trigger.include_custom_invite_codes && trigger.include_custom_invite_codes.includes(code.toLowerCase())) {
          return { extra: { type, code } };
        }
        if (trigger.exclude_custom_invite_codes && !trigger.exclude_custom_invite_codes.includes(code.toLowerCase())) {
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
