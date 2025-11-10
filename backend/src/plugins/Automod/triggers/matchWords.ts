import escapeStringRegexp from "escape-string-regexp";
import { z } from "zod";
import { normalizeText } from "../../../utils/normalizeText.js";
import { stripMarkdown } from "../../../utils/stripMarkdown.js";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary.js";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage.js";
import { automodTrigger } from "../helpers.js";
import { escapeInlineCode } from "discord.js";

interface MatchResultType {
  word: string;
  type: MatchableTextType;
}

const regexCache = new WeakMap<any, RegExp[]>();

const configSchema = z.strictObject({
  words: z.array(z.string().max(2000)).max(1024),
  case_sensitive: z.boolean().default(false),
  only_full_words: z.boolean().default(true),
  normalize: z.boolean().default(false),
  loose_matching: z.boolean().default(false),
  loose_matching_threshold: z.number().int().default(1),
  strip_markdown: z.boolean().default(false),
  match_messages: z.boolean().default(true),
  match_embeds: z.boolean().default(false),
  match_visible_names: z.boolean().default(false),
  match_usernames: z.boolean().default(false),
  match_nicknames: z.boolean().default(false),
  match_custom_status: z.boolean().default(false),
});

export const MatchWordsTrigger = automodTrigger<MatchResultType>()({
  configSchema,
  async match({ pluginData, context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    if (!regexCache.has(trigger)) {
      const looseMatchingThreshold = Math.min(Math.max(trigger.loose_matching_threshold, 1), 64);

      const patterns = trigger.words.map((word) => {
        let pattern;

        if (trigger.loose_matching) {
          pattern = [...word].map((c) => escapeStringRegexp(c)).join(`[\\s\\-_.,!?]{0,${looseMatchingThreshold}}`);
        } else {
          pattern = escapeStringRegexp(word);
        }

        if (trigger.only_full_words) {
          if (trigger.loose_matching) {
            pattern = `\\b(?:${pattern})\\b`;
          } else {
            pattern = `\\b${pattern}\\b`;
          }
        }

        return pattern;
      });

      const mergedRegex = new RegExp(patterns.map((p) => `(${p})`).join("|"), trigger.case_sensitive ? "" : "i");

      regexCache.set(trigger, [mergedRegex]);
    }

    const regexes = regexCache.get(trigger)!;

    for await (let [type, str] of matchMultipleTextTypesOnMessage(pluginData, trigger, context.message)) {
      if (trigger.strip_markdown) {
        str = stripMarkdown(str);
      }

      if (trigger.normalize) {
        str = normalizeText(str);
      }

      for (const regex of regexes) {
        const match = regex.exec(str);
        if (match) {
          const matchedWordIndex = match.slice(1).findIndex((group) => group !== undefined);
          const matchedWord = trigger.words[matchedWordIndex];

          return {
            extra: {
              type,
              word: matchedWord,
            },
          };
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const partialSummary = getTextMatchPartialSummary(pluginData, matchResult.extra.type, contexts[0]);
    const wordInfo = matchResult.extra.word ? ` (\`${escapeInlineCode(matchResult.extra.word)}\`)` : "";
    return `Matched word${wordInfo} in ${partialSummary}`;
  },
});
