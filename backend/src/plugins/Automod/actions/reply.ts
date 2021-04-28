import * as t from "io-ts";
import { automodAction } from "../helpers";
import {
  convertDelayStringToMS,
  noop,
  renderRecursively,
  StrictMessageContent,
  stripObjectToScalars,
  tDelayString,
  tMessageContent,
  tNullable,
  unique,
  verboseChannelMention,
} from "../../../utils";
import { AdvancedMessageContent, Constants, MessageContent, TextChannel, User } from "eris";
import { AutomodContext } from "../types";
import { renderTemplate } from "../../../templateFormatter";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { LogType } from "../../../data/LogType";

export const ReplyAction = automodAction({
  configType: t.union([
    t.string,
    t.type({
      text: tMessageContent,
      auto_delete: tNullable(t.union([tDelayString, t.number])),
    }),
  ]),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const contextsWithTextChannels = contexts
      .filter(c => c.message?.channel_id)
      .filter(c => pluginData.guild.channels.get(c.message!.channel_id) instanceof TextChannel);

    const contextsByChannelId = contextsWithTextChannels.reduce((map: Map<string, AutomodContext[]>, context) => {
      if (!map.has(context.message!.channel_id)) {
        map.set(context.message!.channel_id, []);
      }

      map.get(context.message!.channel_id)!.push(context);
      return map;
    }, new Map());

    for (const [channelId, _contexts] of contextsByChannelId.entries()) {
      const users = unique(Array.from(new Set(_contexts.map(c => c.user).filter(Boolean)))) as User[];
      const user = users[0];

      const renderReplyText = async str =>
        renderTemplate(str, {
          user: stripObjectToScalars(user),
        });
      const formatted =
        typeof actionConfig === "string"
          ? await renderReplyText(actionConfig)
          : ((await renderRecursively(actionConfig.text, renderReplyText)) as AdvancedMessageContent);

      if (formatted) {
        const channel = pluginData.guild.channels.get(channelId) as TextChannel;

        // Check for basic Send Messages and View Channel permissions
        if (
          !hasDiscordPermissions(
            channel.permissionsOf(pluginData.client.user.id),
            Constants.Permissions.sendMessages | Constants.Permissions.readMessages,
          )
        ) {
          pluginData.state.logs.log(LogType.BOT_ALERT, {
            body: `Missing permissions to reply in ${verboseChannelMention(channel)} in Automod rule \`${ruleName}\``,
          });
          continue;
        }

        // If the message is an embed, check for embed permissions
        if (
          typeof formatted !== "string" &&
          !hasDiscordPermissions(channel.permissionsOf(pluginData.client.user.id), Constants.Permissions.embedLinks)
        ) {
          pluginData.state.logs.log(LogType.BOT_ALERT, {
            body: `Missing permissions to reply **with an embed** in ${verboseChannelMention(
              channel,
            )} in Automod rule \`${ruleName}\``,
          });
          continue;
        }

        const messageContent: StrictMessageContent = typeof formatted === "string" ? { content: formatted } : formatted;
        const replyMsg = await channel.createMessage({
          ...messageContent,
          allowedMentions: {
            users: [user.id],
          },
        });

        if (typeof actionConfig === "object" && actionConfig.auto_delete) {
          const delay = convertDelayStringToMS(String(actionConfig.auto_delete))!;
          setTimeout(() => replyMsg.delete().catch(noop), delay);
        }
      }
    }
  },
});
