import { escapeInlineCode } from "discord.js";
import * as t from "io-ts";
import { phishermanDomainIsSafe } from "../../../data/Phisherman";
import { allowTimeout } from "../../../RegExpRunner";
import { getUrlsInString, tNullable } from "../../../utils";
import { mergeRegexes } from "../../../utils/mergeRegexes";
import { mergeWordsIntoRegex } from "../../../utils/mergeWordsIntoRegex";
import { TRegex } from "../../../validatorUtils";
import { PhishermanPlugin } from "../../Phisherman/PhishermanPlugin";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";
import { automodTrigger } from "../helpers";

interface MatchResultType {
  type: MatchableTextType;
  link: string;
  details?: string;
}

const regexCache = new WeakMap<any, RegExp[]>();

const quickLinkCheck = /^https?:\/\//i;

export const MatchLinksTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    include_domains: tNullable(t.array(t.string)),
    exclude_domains: tNullable(t.array(t.string)),
    include_subdomains: t.boolean,
    include_words: tNullable(t.array(t.string)),
    exclude_words: tNullable(t.array(t.string)),
    include_regex: tNullable(t.array(TRegex)),
    exclude_regex: tNullable(t.array(TRegex)),
    phisherman: tNullable(
      t.type({
        include_suspected: tNullable(t.boolean),
        include_verified: tNullable(t.boolean),
      }),
    ),
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
    match_embeds: false,
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
        if (trigger.only_real_links && !quickLinkCheck.test(link.input)) {
          continue;
        }

        const normalizedHostname = link.hostname.toLowerCase();

        // Exclude > Include
        // In order of specificity, regex > word > domain

        if (trigger.exclude_regex) {
          if (!regexCache.has(trigger.exclude_regex)) {
            const toCache = mergeRegexes(trigger.exclude_regex, "i");
            regexCache.set(trigger.exclude_regex, toCache);
          }
          const regexes = regexCache.get(trigger.exclude_regex)!;

          for (const sourceRegex of regexes) {
            const matches = await pluginData.state.regexRunner.exec(sourceRegex, link.input).catch(allowTimeout);
            if (matches) {
              continue typeLoop;
            }
          }
        }

        if (trigger.include_regex) {
          if (!regexCache.has(trigger.include_regex)) {
            const toCache = mergeRegexes(trigger.include_regex, "i");
            regexCache.set(trigger.include_regex, toCache);
          }
          const regexes = regexCache.get(trigger.include_regex)!;

          for (const sourceRegex of regexes) {
            const matches = await pluginData.state.regexRunner.exec(sourceRegex, link.input).catch(allowTimeout);
            if (matches) {
              return { extra: { type, link: link.input } };
            }
          }
        }

        if (trigger.exclude_words) {
          if (!regexCache.has(trigger.exclude_words)) {
            const toCache = mergeWordsIntoRegex(trigger.exclude_words, "i");
            regexCache.set(trigger.exclude_words, [toCache]);
          }
          const regexes = regexCache.get(trigger.exclude_words)!;

          for (const regex of regexes) {
            if (regex.test(link.input)) {
              continue typeLoop;
            }
          }
        }

        if (trigger.include_words) {
          if (!regexCache.has(trigger.include_words)) {
            const toCache = mergeWordsIntoRegex(trigger.include_words, "i");
            regexCache.set(trigger.include_words, [toCache]);
          }
          const regexes = regexCache.get(trigger.include_words)!;

          for (const regex of regexes) {
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

        if (trigger.phisherman) {
          const phishermanResult = await pluginData.getPlugin(PhishermanPlugin).getDomainInfo(normalizedHostname);
          if (phishermanResult != null && !phishermanDomainIsSafe(phishermanResult)) {
            if (
              (trigger.phisherman.include_suspected && !phishermanResult.verifiedPhish) ||
              (trigger.phisherman.include_verified && phishermanResult.verifiedPhish)
            ) {
              const suspectedVerified = phishermanResult.verifiedPhish ? "verified" : "suspected";
              return {
                extra: {
                  type,
                  link: link.input,
                  details: `using Phisherman (${suspectedVerified})`,
                },
              };
            }
          }
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const partialSummary = getTextMatchPartialSummary(pluginData, matchResult.extra.type, contexts[0]);
    let information = `Matched link \`${escapeInlineCode(matchResult.extra.link)}\``;
    if (matchResult.extra.details) {
      information += ` ${matchResult.extra.details}`;
    }
    information += ` in ${partialSummary}`;
    return information;
  },
});
