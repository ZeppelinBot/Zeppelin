import escapeStringRegexp from "escape-string-regexp";
import * as t from "io-ts";
import { normalizeText } from "../../../utils/normalizeText";
import { stripMarkdown } from "../../../utils/stripMarkdown";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";
import { automodTrigger } from "../helpers";

interface MatchResultType {
  word: string;
  type: MatchableTextType;
}

const regexCache = new WeakMap<any, RegExp[]>();

export const MatchWordsTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    words: t.array(t.string),
    case_sensitive: t.boolean,
    only_full_words: t.boolean,
    normalize: t.boolean,
    loose_matching: t.boolean,
    loose_matching_threshold: t.number,
    strip_markdown: t.boolean,
    match_messages: t.boolean,
    match_embeds: t.boolean,
    match_visible_names: t.boolean,
    match_usernames: t.boolean,
    match_nicknames: t.boolean,
    match_custom_status: t.boolean,
  }),

  defaultConfig: {
    case_sensitive: false,
    only_full_words: true,
    normalize: false,
    loose_matching: false,
    loose_matching_threshold: 4,
    strip_markdown: false,
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

    if (!regexCache.has(trigger)) {
      const looseMatchingThreshold = Math.min(Math.max(trigger.loose_matching_threshold, 1), 64);
      const patterns = trigger.words.map((word) => {
        let pattern = trigger.loose_matching
          ? [...word].map((c) => escapeStringRegexp(c)).join(`(?:\\s*|.{0,${looseMatchingThreshold})`)
          : escapeStringRegexp(word);

        if (trigger.only_full_words) {
          pattern = `\\b${pattern}\\b`;
        }

        return pattern;
      });

      const mergedRegex = new RegExp(patterns.map((p) => `(?:${p})`).join("|"), trigger.case_sensitive ? "" : "i");
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
        if (regex.test(str)) {
          return {
            extra: {
              type,
              word: "",
            },
          };
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const partialSummary = getTextMatchPartialSummary(pluginData, matchResult.extra.type, contexts[0]);
    return `Matched word in ${partialSummary}`;
  },
});
