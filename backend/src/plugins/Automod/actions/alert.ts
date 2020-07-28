import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { asyncMap, messageLink, resolveMember, stripObjectToScalars, tNullable } from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { TextChannel } from "eris";
import { renderTemplate } from "../../../templateFormatter";

export const AlertAction = automodAction({
  configType: t.type({
    channel: t.string,
    text: t.string,
  }),

  async apply({ pluginData, contexts, actionConfig, ruleName, matchResult }) {
    const channel = pluginData.guild.channels.get(actionConfig.channel);

    if (channel && channel instanceof TextChannel) {
      const text = actionConfig.text;
      const theMessageLink =
        contexts[0].message && messageLink(pluginData.guild.id, contexts[0].message.channel_id, contexts[0].message.id);

      const safeUsers = contexts.map(c => c.user && stripObjectToScalars(c.user)).filter(Boolean);
      const safeUser = safeUsers[0];

      const takenActions = Object.keys(pluginData.config.get().rules[ruleName].actions);
      // TODO: Generate logMessage
      const logMessage = "";

      const rendered = await renderTemplate(actionConfig.text, {
        rule: ruleName,
        user: safeUser,
        users: safeUsers,
        text,
        matchSummary: matchResult.summary,
        messageLink: theMessageLink,
        logMessage,
      });
      channel.createMessage(rendered);
    } else {
      // TODO: Post BOT_ALERT log
      /*this.getLogs().log(LogType.BOT_ALERT, {
        body: `Invalid channel id \`${actionConfig.channel}\` for alert action in automod rule **${rule.name}**`,
      });*/
    }
  },
});
