import { Attachment, MessageMentionOptions, SendableChannels, TextBasedChannel } from "discord.js";
import { guildPlugin } from "vety";
import { GenericCommandSource, makePublicFn, sendContextResponse } from "../../pluginUtils.js";
import { errorMessage, successMessage } from "../../utils.js";
import { getErrorEmoji, getSuccessEmoji } from "./functions/getEmoji.js";
import { CommonPluginType, zCommonConfig } from "./types.js";

export const CommonPlugin = guildPlugin<CommonPluginType>()({
  name: "common",
  dependencies: () => [],
  configSchema: zCommonConfig,
  public(pluginData) {
    return {
      getSuccessEmoji: makePublicFn(pluginData, getSuccessEmoji),
      getErrorEmoji: makePublicFn(pluginData, getErrorEmoji),

      sendSuccessMessage: async (
        context: GenericCommandSource | SendableChannels,
        body: string,
        allowedMentions?: MessageMentionOptions,
        responseInteraction?: never,
        ephemeral = true,
      ) => {
        const emoji = getSuccessEmoji(pluginData);
        const formattedBody = successMessage(body, emoji);
        const content = allowedMentions ? { content: formattedBody, allowedMentions } : { content: formattedBody };
        if ("isSendable" in context) {
          return context.send(content);
        }
        return sendContextResponse(context, content, ephemeral);
      },

      sendErrorMessage: async (
        context: GenericCommandSource | SendableChannels,
        body: string,
        allowedMentions?: MessageMentionOptions,
        responseInteraction?: never,
        ephemeral = true,
      ) => {
        const emoji = getErrorEmoji(pluginData);
        const formattedBody = errorMessage(body, emoji);
        const content = allowedMentions ? { content: formattedBody, allowedMentions } : { content: formattedBody };
        if ("isSendable" in context) {
          return context.send(content);
        }
        return sendContextResponse(context, content, ephemeral);
      },

      storeAttachmentsAsMessage: async (attachments: Attachment[], backupChannel?: TextBasedChannel | null) => {
        const attachmentChannelId = pluginData.config.get().attachment_storing_channel;
        const channel = attachmentChannelId
          ? ((pluginData.guild.channels.cache.get(attachmentChannelId) as TextBasedChannel) ?? backupChannel)
          : backupChannel;

        if (!channel) {
          throw new Error(
            "Cannot store attachments: no attachment storing channel configured, and no backup channel passed",
          );
        }
        if (!channel.isSendable()) {
          throw new Error("Passed attachment storage channel is not sendable");
        }

        return channel.send({
          content: `Storing ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`,
          files: attachments.map((a) => a.url),
        });
      },
    };
  },
});
