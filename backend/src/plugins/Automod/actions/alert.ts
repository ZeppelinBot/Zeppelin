import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import {
  asyncMap,
  createChunkedMessage,
  isDiscordRESTError,
  messageLink,
  resolveMember,
  stripObjectToScalars,
  tNullable,
  verboseChannelMention,
} from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { TextChannel } from "eris";
import { renderTemplate, TemplateParseError } from "../../../templateFormatter";
import { LogsPlugin } from "../../Logs/LogsPlugin";

export const AlertAction = automodAction({
  configType: t.type({
    channel: t.string,
    text: t.string,
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, ruleName, matchResult }) {
    const channel = pluginData.guild.channels.get(actionConfig.channel);
    const logs = pluginData.getPlugin(LogsPlugin);

    if (channel && channel instanceof TextChannel) {
      const text = actionConfig.text;
      const theMessageLink =
        contexts[0].message && messageLink(pluginData.guild.id, contexts[0].message.channel_id, contexts[0].message.id);

      const safeUsers = contexts.map(c => c.user && stripObjectToScalars(c.user)).filter(Boolean);
      const safeUser = safeUsers[0];
      const actionsTaken = Object.keys(pluginData.config.get().rules[ruleName].actions).join(", ");

      const logMessage = await logs.getLogMessage(LogType.AUTOMOD_ACTION, {
        rule: ruleName,
        user: safeUser,
        users: safeUsers,
        actionsTaken,
        matchSummary: matchResult.summary,
      });

      let rendered;
      try {
        rendered = await renderTemplate(actionConfig.text, {
          rule: ruleName,
          user: safeUser,
          users: safeUsers,
          text,
          actionsTaken,
          matchSummary: matchResult.summary,
          messageLink: theMessageLink,
          logMessage,
        });
      } catch (err) {
        if (err instanceof TemplateParseError) {
          pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
            body: `Error in alert format of automod rule ${ruleName}: ${err.message}`,
          });
          return;
        }

        throw err;
      }

      try {
        await createChunkedMessage(channel, rendered);
      } catch (err) {
        if (err.code === 50001) {
          logs.log(LogType.BOT_ALERT, {
            body: `Missing access to send alert to channel ${verboseChannelMention(
              channel,
            )} in automod rule **${ruleName}**`,
          });
        } else {
          logs.log(LogType.BOT_ALERT, {
            body: `Error ${err.code || "UNKNOWN"} when sending alert to channel ${verboseChannelMention(
              channel,
            )} in automod rule **${ruleName}**`,
          });
        }
      }
    } else {
      logs.log(LogType.BOT_ALERT, {
        body: `Invalid channel id \`${actionConfig.channel}\` for alert action in automod rule **${ruleName}**`,
      });
    }
  },
});
