import { Snowflake, TextChannel, ThreadChannel } from "discord.js";
import * as t from "io-ts";
import { erisAllowedMentionsToDjsMentionOptions } from "src/utils/erisAllowedMentionsToDjsMentionOptions";
import { LogType } from "../../../data/LogType";
import {
  createTypedTemplateSafeValueContainer,
  renderTemplate,
  TemplateParseError,
  TemplateSafeValueContainer,
} from "../../../templateFormatter";
import {
  createChunkedMessage,
  messageLink,
  stripObjectToScalars,
  tAllowedMentions,
  tNormalizedNullOptional,
  isTruthy,
  verboseChannelMention,
  validateAndParseMessageContent,
  chunkMessageLines,
} from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { automodAction } from "../helpers";
import { TemplateSafeUser, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { messageIsEmpty } from "../../../utils/messageIsEmpty";
import { InternalPosterPlugin } from "../../InternalPoster/InternalPosterPlugin";

export const AlertAction = automodAction({
  configType: t.type({
    channel: t.string,
    text: t.string,
    allowed_mentions: tNormalizedNullOptional(tAllowedMentions),
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, ruleName, matchResult }) {
    const channel = pluginData.guild.channels.cache.get(actionConfig.channel as Snowflake);
    const logs = pluginData.getPlugin(LogsPlugin);

    if (channel?.isText()) {
      const text = actionConfig.text;
      const theMessageLink =
        contexts[0].message && messageLink(pluginData.guild.id, contexts[0].message.channel_id, contexts[0].message.id);

      const safeUsers = contexts.map((c) => (c.user ? userToTemplateSafeUser(c.user) : null)).filter(isTruthy);
      const safeUser = safeUsers[0];
      const actionsTaken = Object.keys(pluginData.config.get().rules[ruleName].actions).join(", ");

      const logMessage = await logs.getLogMessage(
        LogType.AUTOMOD_ACTION,
        createTypedTemplateSafeValueContainer({
          rule: ruleName,
          user: safeUser,
          users: safeUsers,
          actionsTaken,
          matchSummary: matchResult.summary ?? "",
        }),
      );

      let rendered;
      try {
        rendered = await renderTemplate(
          actionConfig.text,
          new TemplateSafeValueContainer({
            rule: ruleName,
            user: safeUser,
            users: safeUsers,
            text,
            actionsTaken,
            matchSummary: matchResult.summary,
            messageLink: theMessageLink,
            logMessage: validateAndParseMessageContent(logMessage)?.content,
          }),
        );
      } catch (err) {
        if (err instanceof TemplateParseError) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Error in alert format of automod rule ${ruleName}: ${err.message}`,
          });
          return;
        }

        throw err;
      }

      if (messageIsEmpty(rendered)) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Tried to send alert with an empty message for automod rule ${ruleName}`,
        });
        return;
      }

      try {
        const poster = pluginData.getPlugin(InternalPosterPlugin);
        const chunks = chunkMessageLines(rendered);
        for (const chunk of chunks) {
          await poster.sendMessage(channel, {
            content: rendered,
            allowedMentions: erisAllowedMentionsToDjsMentionOptions(actionConfig.allowed_mentions),
          });
        }
      } catch (err) {
        if (err.code === 50001) {
          logs.logBotAlert({
            body: `Missing access to send alert to channel ${verboseChannelMention(
              channel,
            )} in automod rule **${ruleName}**`,
          });
        } else {
          logs.logBotAlert({
            body: `Error ${err.code || "UNKNOWN"} when sending alert to channel ${verboseChannelMention(
              channel,
            )} in automod rule **${ruleName}**`,
          });
        }
      }
    } else {
      logs.logBotAlert({
        body: `Invalid channel id \`${actionConfig.channel}\` for alert action in automod rule **${ruleName}**`,
      });
    }
  },
});
