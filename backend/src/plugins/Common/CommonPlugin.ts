import {
  ChatInputCommandInteraction,
  Message,
  MessageCreateOptions,
  MessageMentionOptions,
  ModalSubmitInteraction,
  TextBasedChannel,
  User,
} from "discord.js";
import { PluginOptions } from "knub";
import { logger } from "../../logger";
import { isContextInteraction, sendContextResponse } from "../../pluginUtils";
import { errorMessage, successMessage } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { getErrorEmoji, getSuccessEmoji } from "./functions/getEmoji";
import { CommonPluginType, zCommonConfig } from "./types";

const defaultOptions: PluginOptions<CommonPluginType> = {
  config: {
    success_emoji: "✅",
    error_emoji: "❌",
  },
};

export const CommonPlugin = zeppelinGuildPlugin<CommonPluginType>()({
  name: "common",
  showInDocs: false,
  info: {
    prettyName: "Common",
  },

  dependencies: () => [],
  configParser: (input) => zCommonConfig.parse(input),
  defaultOptions,
  public: {
    getSuccessEmoji(pluginData) {
      return () => getSuccessEmoji(pluginData);
    },

    getErrorEmoji(pluginData) {
      return () => getErrorEmoji(pluginData);
    },

    sendSuccessMessage(pluginData) {
      return async (
        context: TextBasedChannel | Message | User | ChatInputCommandInteraction,
        body: string,
        allowedMentions?: MessageMentionOptions,
        responseInteraction?: ModalSubmitInteraction,
        ephemeral = true,
      ): Promise<Message | undefined> => {
        const emoji = getSuccessEmoji(pluginData);
        const formattedBody = successMessage(body, emoji);
        const content: MessageCreateOptions = allowedMentions
          ? { content: formattedBody, allowedMentions }
          : { content: formattedBody };

        if (responseInteraction) {
          await responseInteraction
            .editReply({ content: formattedBody, embeds: [], components: [] })
            .catch((err) => logger.error(`Interaction reply failed: ${err}`));

          return;
        }

        if (!isContextInteraction(context)) {
          // noinspection TypeScriptValidateJSTypes
          return sendContextResponse(context, { ...content }) // Force line break
            .catch((err) => {
              const channelInfo =
                "guild" in context && context.guild ? `${context.id} (${context.guild.id})` : context.id;

              logger.warn(`Failed to send success message to ${channelInfo}): ${err.code} ${err.message}`);

              return undefined;
            });
        }

        const replyMethod = context.replied || context.deferred ? "editReply" : "reply";

        return context[replyMethod]({
          content: formattedBody,
          embeds: [],
          components: [],
          fetchReply: true,
          ephemeral,
        }).catch((err) => {
          logger.error(`Context reply failed: ${err}`);

          return undefined;
        }) as Promise<Message>;
      };
    },

    sendErrorMessage(pluginData) {
      return async (
        context: TextBasedChannel | Message | User | ChatInputCommandInteraction,
        body: string,
        allowedMentions?: MessageMentionOptions,
        responseInteraction?: ModalSubmitInteraction,
        ephemeral = true,
      ): Promise<Message | undefined> => {
        const emoji = getErrorEmoji(pluginData);
        const formattedBody = errorMessage(body, emoji);
        const content: MessageCreateOptions = allowedMentions
          ? { content: formattedBody, allowedMentions }
          : { content: formattedBody };

        if (responseInteraction) {
          await responseInteraction
            .editReply({ content: formattedBody, embeds: [], components: [] })
            .catch((err) => logger.error(`Interaction reply failed: ${err}`));

          return;
        }

        if (!isContextInteraction(context)) {
          // noinspection TypeScriptValidateJSTypes
          return sendContextResponse(context, { ...content }) // Force line break
            .catch((err) => {
              const channelInfo =
                "guild" in context && context.guild ? `${context.id} (${context.guild.id})` : context.id;

              logger.warn(`Failed to send error message to ${channelInfo}): ${err.code} ${err.message}`);

              return undefined;
            });
        }

        const replyMethod = context.replied || context.deferred ? "editReply" : "reply";

        return context[replyMethod]({
          content: formattedBody,
          embeds: [],
          components: [],
          fetchReply: true,
          ephemeral,
        }).catch((err) => {
          logger.error(`Context reply failed: ${err}`);

          return undefined;
        }) as Promise<Message>;
      };
    },
  },
});
