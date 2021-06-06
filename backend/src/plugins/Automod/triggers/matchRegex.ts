import * as t from "io-ts";
import { allowTimeout } from "../../../RegExpRunner";
import { disableInlineCode } from "../../../utils";
import { normalizeText } from "../../../utils/normalizeText";
import { stripMarkdown } from "../../../utils/stripMarkdown";
import { TRegex } from "../../../validatorUtils";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";
import { automodTrigger } from "../helpers";

interface MatchResultType {
  pattern: string;
  type: MatchableTextType;
}

export const MatchRegexTrigger = automodTrigger<MatchResultType>()({
  configType: t.type({
    patterns: t.array(TRegex),
    case_sensitive: t.boolean,
    normalize: t.boolean,
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
    normalize: false,
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

    for await (let [type, str] of matchMultipleTextTypesOnMessage(pluginData, trigger, context.message)) {
      if (trigger.strip_markdown) {
        str = stripMarkdown(str);
      }

      if (trigger.normalize) {
        str = normalizeText(str);
      }

      for (const sourceRegex of trigger.patterns) {
        const regex = new RegExp(sourceRegex.source, trigger.case_sensitive && !sourceRegex.ignoreCase ? "" : "i");
        const matches = await pluginData.state.regexRunner.exec(regex, str).catch(allowTimeout);
        if (matches?.length) {
          return {
            extra: {
              pattern: sourceRegex.source,
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
    return `Matched regex \`${disableInlineCode(matchResult.extra.pattern)}\` in ${partialSummary}`;
  },
});
