import { PermissionsBitField, Snowflake, TextChannel } from "discord.js";
import { TemplateParseError, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import {
  createChunkedMessage,
  renderRecursively,
  verboseChannelMention,
  verboseUserMention
} from "../../../utils.js";
import { MessageContent } from "../../../utils.js";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions.js";
import { sendDM } from "../../../utils/sendDM.js";
import {
  guildToTemplateSafeGuild,
  memberToTemplateSafeMember,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { welcomeMessageEvt } from "../types.js";

export const SendWelcomeMessageEvt = welcomeMessageEvt({
  event: "guildMemberAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const member = meta.args.member;

    const config = pluginData.config.get();
    if (!config.message) return;
    if (!config.send_dm && !config.send_to_channel) return;

    // Only send welcome messages once per user (even if they rejoin) until the plugin is reloaded
    if (pluginData.state.sentWelcomeMessages.has(member.id)) {
      return;
    }

    pluginData.state.sentWelcomeMessages.add(member.id);

    const templateValues = new TemplateSafeValueContainer({
      member: memberToTemplateSafeMember(member),
      user: userToTemplateSafeUser(member.user),
      guild: guildToTemplateSafeGuild(member.guild),
    });

    const renderMessageText = (str: string) => renderTemplate(str, templateValues);

    let formatted: MessageContent;

    try {
      formatted = typeof config.message === "string"
        ? await renderMessageText(config.message)
        : ((await renderRecursively(config.message, renderMessageText)) as MessageContent);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Error formatting welcome message: ${e.message}`,
        });
        return;
      }
      throw e;
    }

    if (config.send_dm) {
      try {
        await sendDM(member.user, formatted, "welcome message");
      } catch {
        pluginData.getPlugin(LogsPlugin).logDmFailed({
          source: "welcome message",
          user: member.user,
        });
      }
    }

    if (config.send_to_channel) {
      const channel = meta.args.member.guild.channels.cache.get(config.send_to_channel as Snowflake);
      if (!channel || !(channel instanceof TextChannel)) return;

      if (
        !hasDiscordPermissions(
          channel.permissionsFor(pluginData.client.user!.id),
          PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.ViewChannel,
        )
      ) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Missing permissions to send welcome message in ${verboseChannelMention(channel)}`,
        });
        return;
      }

      if (
        typeof formatted === "object" && formatted.embeds && formatted.embeds.length > 0 &&
        !hasDiscordPermissions(
          channel.permissionsFor(pluginData.client.user!.id),
          PermissionsBitField.Flags.EmbedLinks,
        )
      ) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Missing permissions to send welcome message **with embeds** in ${verboseChannelMention(channel)}`,
        });
        return;
      }

      try {
        if (typeof formatted === "string") {
          await createChunkedMessage(channel, formatted, {
            parse: ["users"],
          });
        } else {
          await channel.send({
            ...formatted,
            allowedMentions: {
              parse: ["users"],
            },
          });
        }
      } catch {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Failed to send welcome message for ${verboseUserMention(member.user)} to ${verboseChannelMention(channel)}`,
        });
      }
    }
  },
});