import * as t from "io-ts";
import escapeStringRegexp from "escape-string-regexp";
import { automodTrigger } from "../helpers";
import {
  asSingleLine,
  disableCodeBlocks,
  disableInlineCode,
  getUrlsInString,
  tNullable,
  verboseChannelMention,
} from "../../../utils";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";
import { TSafeRegex } from "../../../validatorUtils";

interface MatchResultType {
  type: MatchableTextType;
  link: string;
}

export const MatchLinksTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    include_domains: tNullable(t.array(t.string)),
    exclude_domains: tNullable(t.array(t.string)),
    include_subdomains: t.boolean,
    include_words: tNullable(t.array(t.string)),
    exclude_words: tNullable(t.array(t.string)),
    include_regex: tNullable(t.array(TSafeRegex)),
    exclude_regex: tNullable(t.array(TSafeRegex)),
    only_real_links: t.boolean,
    match_messages: t.boolean,
    match_embeds: t.boolean,
    match_visible_names: t.boolean,
    match_usernames: t.boolean,
    match_nicknames: t.boolean,
    match_custom_status: t.boolean,
  }),

  defaultConfig: {
    include_subdomains: true,
    match_messages: true,
    match_embeds: true,
    match_visible_names: false,
    match_usernames: false,
    match_nicknames: false,
    match_custom_status: false,
    only_real_links: true,
  },

  async match({ pluginData, context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    typeLoop: for await (const [type, str] of matchMultipleTextTypesOnMessage(pluginData, trigger, context.message)) {
      const links = getUrlsInString(str, true);

      for (const link of links) {
        // "real link" = a link that Discord highlights
        if (trigger.only_real_links && !link.input.match(/^https?:\/\//i)) {
          continue;
        }

        const normalizedHostname = link.hostname.toLowerCase();

        // Exclude > Include
        // In order of specificity, regex > word > domain

        if (trigger.exclude_regex) {
          for (const pattern of trigger.exclude_regex) {
            if (pattern.test(link.input)) {
              continue typeLoop;
            }
          }
        }

        if (trigger.include_regex) {
          for (const pattern of trigger.include_regex) {
            if (pattern.test(link.input)) {
              return { extra: { type, link: link.input } };
            }
          }
        }

        if (trigger.exclude_words) {
          for (const word of trigger.exclude_words) {
            const regex = new RegExp(escapeStringRegexp(word), "i");
            if (regex.test(link.input)) {
              continue typeLoop;
            }
          }
        }

        if (trigger.include_words) {
          for (const word of trigger.include_words) {
            const regex = new RegExp(escapeStringRegexp(word), "i");
            if (regex.test(link.input)) {
              return { extra: { type, link: link.input } };
            }
          }
        }

        if (trigger.exclude_domains) {
          for (const domain of trigger.exclude_domains) {
            const normalizedDomain = domain.toLowerCase();
            if (normalizedDomain === normalizedHostname) {
              continue typeLoop;
            }
            if (trigger.include_subdomains && normalizedHostname.endsWith(`.${domain}`)) {
              continue typeLoop;
            }
          }

          return { extra: { type, link: link.toString() } };
        }

        if (trigger.include_domains) {
          for (const domain of trigger.include_domains) {
            const normalizedDomain = domain.toLowerCase();
            if (normalizedDomain === normalizedHostname) {
              return { extra: { type, link: domain } };
            }
            if (trigger.include_subdomains && normalizedHostname.endsWith(`.${domain}`)) {
              return { extra: { type, link: domain } };
            }
          }
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const channel = pluginData.guild.channels.get(contexts[0].message.channel_id);
    const prettyChannel = verboseChannelMention(channel);

    return (
      asSingleLine(`
      Matched link \`${disableInlineCode(matchResult.extra.link)}\`
      in message (\`${contexts[0].message.id}\`) in ${prettyChannel}:
    `) +
      "\n```" +
      disableCodeBlocks(contexts[0].message.data.content) +
      "```"
    );
  },
});
