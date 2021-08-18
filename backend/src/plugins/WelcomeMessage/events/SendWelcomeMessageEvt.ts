import { Snowflake, TextChannel } from "discord.js";
import {
  channelToTemplateSafeChannel,
  guildToTemplateSafeGuild,
  memberToTemplateSafeMember,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { renderTemplate, TemplateParseError, TemplateSafeValueContainer } from "../../../templateFormatter";
import { createChunkedMessage, stripObjectToScalars, verboseChannelMention, verboseUserMention } from "../../../utils";
import { sendDM } from "../../../utils/sendDM";
import { welcomeMessageEvt } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";

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

    let formatted;

    try {
      formatted = await renderTemplate(
        config.message,
        new TemplateSafeValueContainer({
          member: memberToTemplateSafeMember(member),
          user: userToTemplateSafeUser(member.user),
          guild: guildToTemplateSafeGuild(member.guild),
        }),
      );
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

      try {
        await createChunkedMessage(channel, formatted);
      } catch {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Failed send a welcome message for ${verboseUserMention(member.user)} to ${verboseChannelMention(
            channel,
          )}`,
        });
      }
    }
  },
});
