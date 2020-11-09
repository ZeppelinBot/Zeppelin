import * as t from "io-ts";
import { automodAction } from "../helpers";
import {
  convertDelayStringToMS,
  noop,
  renderRecursively,
  stripObjectToScalars,
  tDelayString,
  tMessageContent,
  tNullable,
  unique,
} from "../../../utils";
import { TextChannel } from "eris";
import { AutomodContext } from "../types";
import { renderTemplate } from "../../../templateFormatter";

export const ReplyAction = automodAction({
  configType: t.union([
    t.string,
    t.type({
      text: tMessageContent,
      auto_delete: tNullable(t.union([tDelayString, t.number])),
    }),
  ]),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig }) {
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
      const users = unique(Array.from(new Set(_contexts.map(c => c.user).filter(Boolean))));
      const user = users[0];

      const renderReplyText = async str =>
        renderTemplate(str, {
          user: stripObjectToScalars(user),
        });
      const formatted =
        typeof actionConfig === "string"
          ? await renderReplyText(actionConfig)
          : await renderRecursively(actionConfig.text, renderReplyText);

      if (formatted) {
        const channel = pluginData.guild.channels.get(channelId) as TextChannel;
        const replyMsg = await channel.createMessage(formatted);

        if (typeof actionConfig === "object" && actionConfig.auto_delete) {
          const delay = convertDelayStringToMS(String(actionConfig.auto_delete))!;
          setTimeout(() => replyMsg.delete().catch(noop), delay);
        }
      }
    }
  },
});
