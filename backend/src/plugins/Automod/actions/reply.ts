import { GuildTextBasedChannel, MessageCreateOptions, PermissionsBitField, Snowflake, User } from "discord.js";
import { z } from "zod";
import { TemplateParseError, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import {
  convertDelayStringToMS,
  noop,
  renderRecursively,
  unique,
  validateAndParseMessageContent,
  verboseChannelMention,
  zBoundedCharacters,
  zDelayString,
  zMessageContent,
} from "../../../utils.js";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions.js";
import { messageIsEmpty } from "../../../utils/messageIsEmpty.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";
import { AutomodContext } from "../types.js";

export const ReplyAction = automodAction({
  configSchema: z.union([
    zBoundedCharacters(0, 4000),
    z.strictObject({
      text: zMessageContent,
      auto_delete: z.union([zDelayString, z.number()]).nullable().default(null),
      inline: z.boolean().default(false),
    }),
  ]),

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const contextsWithTextChannels = contexts
      .filter((c) => c.message?.channel_id)
      .filter((c) => {
        const channel = pluginData.guild.channels.cache.get(c.message!.channel_id as Snowflake);
        return channel?.isTextBased();
      });

    const contextsByChannelId = contextsWithTextChannels.reduce((map: Map<string, AutomodContext[]>, context) => {
      if (!map.has(context.message!.channel_id)) {
        map.set(context.message!.channel_id, []);
      }

      map.get(context.message!.channel_id)!.push(context);
      return map;
    }, new Map());

    for (const [channelId, _contexts] of contextsByChannelId.entries()) {
      const users = unique(Array.from(new Set(_contexts.map((c) => c.user).filter(Boolean)))) as User[];
      const user = users[0];

      const renderReplyText = async (str: string) =>
        renderTemplate(
          str,
          new TemplateSafeValueContainer({
            user: userToTemplateSafeUser(user),
          }),
        );

      let formatted: string | MessageCreateOptions;
      try {
        formatted =
          typeof actionConfig === "string"
            ? await renderReplyText(actionConfig)
            : ((await renderRecursively(actionConfig.text, renderReplyText)) as MessageCreateOptions);
      } catch (err) {
        if (err instanceof TemplateParseError) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Error in reply format of automod rule \`${ruleName}\`: ${err.message}`,
          });
          return;
        }
        throw err;
      }

      if (formatted) {
        const channel = pluginData.guild.channels.cache.get(channelId as Snowflake) as GuildTextBasedChannel;

        // Check for basic Send Messages and View Channel permissions
        if (
          !hasDiscordPermissions(
            channel.permissionsFor(pluginData.client.user!.id),
            PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.ViewChannel,
          )
        ) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Missing permissions to reply in ${verboseChannelMention(channel)} in Automod rule \`${ruleName}\``,
          });
          continue;
        }

        // If the message is an embed, check for embed permissions
        if (
          typeof formatted !== "string" &&
          !hasDiscordPermissions(
            channel.permissionsFor(pluginData.client.user!.id),
            PermissionsBitField.Flags.EmbedLinks,
          )
        ) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Missing permissions to reply **with an embed** in ${verboseChannelMention(
              channel,
            )} in Automod rule \`${ruleName}\``,
          });
          continue;
        }

        const messageContent = validateAndParseMessageContent(formatted);

        const messageOpts: MessageCreateOptions = {
          ...messageContent,
          allowedMentions: {
            users: [user.id],
          },
        };

        if (typeof actionConfig !== "string" && actionConfig.inline) {
          messageOpts.reply = {
            failIfNotExists: false,
            messageReference: _contexts[0].message!.id,
          };
        }

        if (messageIsEmpty(messageOpts)) {
          return;
        }

        const replyMsg = await channel.send(messageOpts);

        if (typeof actionConfig === "object" && actionConfig.auto_delete) {
          const delay = convertDelayStringToMS(String(actionConfig.auto_delete))!;
          setTimeout(() => replyMsg.deletable && replyMsg.delete().catch(noop), delay);
        }
      }
    }
  },
});
