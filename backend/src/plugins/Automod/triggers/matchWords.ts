import * as t from "io-ts";
import { transliterate } from "transliteration";
import escapeStringRegexp from "escape-string-regexp";
import { automodTrigger } from "../helpers";
import { disableInlineCode, verboseChannelMention } from "../../../utils";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary";

interface MatchResultType {
  word: string;
  type: MatchableTextType;
}

export const MatchWordsTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    words: t.array(t.string),
    case_sensitive: t.boolean,
    only_full_words: t.boolean,
    normalize: t.boolean,
    loose_matching: t.boolean,
    loose_matching_threshold: t.number,
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

    for await (let [type, str] of matchMultipleTextTypesOnMessage(pluginData, trigger, context.message)) {
      if (trigger.normalize) {
        str = transliterate(str);
      }

      const looseMatchingThreshold = Math.min(Math.max(trigger.loose_matching_threshold, 1), 64);

      for (const word of trigger.words) {
        // When performing loose matching, allow any amount of whitespace or up to looseMatchingThreshold number of other
        // characters between the matched characters. E.g. if we're matching banana, a loose match could also match b a n a n a
        let pattern = trigger.loose_matching
          ? [...word].map(c => escapeStringRegexp(c)).join(`(?:\\s*|.{0,${looseMatchingThreshold})`)
          : escapeStringRegexp(word);

        if (trigger.only_full_words) {
          pattern = `\\b${pattern}\\b`;
        }

        const regex = new RegExp(pattern, trigger.case_sensitive ? "" : "i");
        const test = regex.test(str);
        if (test) {
          return {
            extra: {
              word,
              type,
            },
          };
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const partialSummary = getTextMatchPartialSummary(pluginData, matchResult.extra.type, contexts[0]);
    return `Matched word \`${disableInlineCode(matchResult.extra.word)}\` in ${partialSummary}`;
  },
});
