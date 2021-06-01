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

import { AutomodContext } from "../types";
import { renderTemplate } from "../../../templateFormatter";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { LogType } from "../../../data/LogType";
import { TextChannel, User, Constants, MessageOptions, Permissions } from "discord.js";

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
      .filter(c => pluginData.guild.channels.cache.get(c.message!.channel_id) instanceof TextChannel);

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
          : ((await renderRecursively(actionConfig.text, renderReplyText)) as MessageOptions);

      if (formatted) {
        const channel = pluginData.guild.channels.cache.get(channelId) as TextChannel;

        // Check for basic Send Messages and View Channel permissions
        if (
          !hasDiscordPermissions(
            channel.permissionsFor(pluginData.client.user!.id),
            Permissions.FLAGS.SEND_MESSAGES | Permissions.FLAGS.VIEW_CHANNEL,
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
          !hasDiscordPermissions(channel.permissionsFor(pluginData.client.user!.id), Permissions.FLAGS.EMBED_LINKS)
        ) {
          pluginData.state.logs.log(LogType.BOT_ALERT, {
            body: `Missing permissions to reply **with an embed** in ${verboseChannelMention(
              channel,
            )} in Automod rule \`${ruleName}\``,
          });
          continue;
        }

        const messageContent: MessageOptions = typeof formatted === "string" ? { content: formatted } : formatted;
        const replyMsg = await channel.send({
          ...messageContent,
          allowedMentions: {
            users: [user.id],
          },
          split: false,
        });

        if (typeof actionConfig === "object" && actionConfig.auto_delete) {
          const delay = convertDelayStringToMS(String(actionConfig.auto_delete))!;
          setTimeout(() => replyMsg.delete().catch(noop), delay);
        }
      }
    }
  },
});
