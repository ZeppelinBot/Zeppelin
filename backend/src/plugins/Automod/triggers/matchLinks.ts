import { escapeInlineCode } from "discord.js";
import { z } from "zod";
import { allowTimeout } from "../../../RegExpRunner.js";
import { getFishFishDomain } from "../../../data/FishFish.js";
import { getUrlsInString, inputPatternToRegExp, zRegex } from "../../../utils.js";
import { mergeRegexes } from "../../../utils/mergeRegexes.js";
import { mergeWordsIntoRegex } from "../../../utils/mergeWordsIntoRegex.js";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary.js";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage.js";
import { automodTrigger } from "../helpers.js";

interface MatchResultType {
  type: MatchableTextType;
  link: string;
  details?: string;
}

const regexCache = new WeakMap<any, RegExp[]>();

const quickLinkCheck = /^https?:\/\//i;

const configSchema = z.strictObject({
  include_domains: z.array(z.string().max(255)).max(700).optional(),
  exclude_domains: z.array(z.string().max(255)).max(700).optional(),
  include_subdomains: z.boolean().default(true),
  include_words: z.array(z.string().max(2000)).max(700).optional(),
  exclude_words: z.array(z.string().max(2000)).max(700).optional(),
  include_regex: z
    .array(zRegex(z.string().max(2000)))
    .max(512)
    .optional(),
  exclude_regex: z
    .array(zRegex(z.string().max(2000)))
    .max(512)
    .optional(),
  phisherman: z
    .strictObject({
      include_suspected: z.boolean().optional(),
      include_verified: z.boolean().optional(),
    })
    .optional(),
  include_malicious: z.boolean().default(false),
  only_real_links: z.boolean().default(true),
  match_messages: z.boolean().default(true),
  match_embeds: z.boolean().default(true),
  match_visible_names: z.boolean().default(false),
  match_usernames: z.boolean().default(false),
  match_nicknames: z.boolean().default(false),
  match_custom_status: z.boolean().default(false),
});

export const MatchLinksTrigger = automodTrigger<MatchResultType>()({
  configSchema,

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
            const toCache = mergeRegexes(
              trigger.exclude_regex.map((pattern) => inputPatternToRegExp(pattern)),
              "i",
            );
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
            const toCache = mergeRegexes(
              trigger.include_regex.map((pattern) => inputPatternToRegExp(pattern)),
              "i",
            );
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

        const includeMalicious =
          trigger.include_malicious || trigger.phisherman?.include_suspected || trigger.phisherman?.include_verified;
        if (includeMalicious) {
          const domainInfo = getFishFishDomain(normalizedHostname);
          if (domainInfo && domainInfo.category !== "safe") {
            return {
              extra: {
                type,
                link: link.input,
                details: `(known ${domainInfo.category} domain)`,
              },
            };
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
