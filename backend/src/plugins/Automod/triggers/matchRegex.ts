import * as t from "io-ts";
import { transliterate } from "transliteration";
import escapeStringRegexp from "escape-string-regexp";
import { automodTrigger } from "../helpers";
import { disableInlineCode, verboseChannelMention } from "../../../utils";
import { MatchableTextType, matchMultipleTextTypesOnMessage } from "../functions/matchMultipleTextTypesOnMessage";

export const MatchRegexTrigger = automodTrigger({
  configType: t.type({
    patterns: t.array(t.string),
    case_sensitive: t.boolean,
    normalize: t.boolean,
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
    match_messages: true,
    match_embeds: true,
    match_visible_names: false,
    match_usernames: false,
    match_nicknames: false,
    match_custom_status: false,
  },

  matchResultType: t.type({
    pattern: t.string,
    type: MatchableTextType,
  }),

  async match({ pluginData, context, triggerConfig: trigger }) {
    if (!context.message) {
      return;
    }

    for await (let [type, str] of matchMultipleTextTypesOnMessage(pluginData, trigger, context.message)) {
      if (trigger.normalize) {
        str = transliterate(str);
      }

      for (const pattern of trigger.patterns) {
        const regex = new RegExp(pattern, trigger.case_sensitive ? "" : "i");
        const test = regex.test(str);
        if (test) {
          return {
            extra: {
              pattern,
              type,
            },
          };
        }
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const channel = pluginData.guild.channels.get(contexts[0].message.channel_id);
    const prettyChannel = verboseChannelMention(channel);

    return `Matched regex \`${disableInlineCode(matchResult.extra.pattern)}\` in message (\`${
      contexts[0].message.id
    }\`) in ${prettyChannel}:`;
  },
});
