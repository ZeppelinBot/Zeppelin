import { z } from "zod";
import { allowTimeout } from "../../../RegExpRunner.js";
import { inputPatternToRegExp, zRegex } from "../../../utils.js";
import { mergeRegexes } from "../../../utils/mergeRegexes.js";
import { normalizeText } from "../../../utils/normalizeText.js";
import { stripMarkdown } from "../../../utils/stripMarkdown.js";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary.js";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage.js";
import { automodTrigger } from "../helpers.js";

interface MatchResultType {
  pattern: string;
  type: MatchableTextType;
}

const configSchema = z.strictObject({
  patterns: z.array(zRegex(z.string().max(2000))).max(512),
  case_sensitive: z.boolean().default(false),
  normalize: z.boolean().default(false),
  strip_markdown: z.boolean().default(false),
  match_messages: z.boolean().default(true),
  match_embeds: z.boolean().default(false),
  match_visible_names: z.boolean().default(false),
  match_usernames: z.boolean().default(false),
  match_nicknames: z.boolean().default(false),
  match_custom_status: z.boolean().default(false),
});

const regexCache = new WeakMap<any, RegExp[]>();

export const MatchRegexTrigger = automodTrigger<MatchResultType>()({
  configSchema,

  async match({ pluginData, context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    if (!regexCache.has(trigger)) {
      const flags = trigger.case_sensitive ? "" : "i";
      const toCache = mergeRegexes(
        trigger.patterns.map((pattern) => inputPatternToRegExp(pattern)),
        flags,
      );
      regexCache.set(trigger, toCache);
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
        const matches = await pluginData.state.regexRunner.exec(regex, str).catch(allowTimeout);
        if (matches?.length) {
          return {
            extra: {
              pattern: regex.source,
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
    return `Matched regex in ${partialSummary}`;
  },
});
