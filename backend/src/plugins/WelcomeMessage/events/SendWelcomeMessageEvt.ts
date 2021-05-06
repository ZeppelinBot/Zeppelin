import { welcomeMessageEvt } from "../types";
import { renderTemplate, TemplateParseError } from "../../../templateFormatter";
import { createChunkedMessage, stripObjectToScalars } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { TextChannel } from "eris";
import { sendDM } from "../../../utils/sendDM";

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
      const strippedMember = stripObjectToScalars(member, ["user", "guild"]);
      formatted = await renderTemplate(config.message, {
        member: strippedMember,
        user: strippedMember["user"],
        guild: strippedMember["guild"],
      });
    } catch (e) {
      if (e instanceof TemplateParseError) {
        pluginData.state.logs.log(LogType.BOT_ALERT, {
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
        pluginData.state.logs.log(LogType.DM_FAILED, {
          source: "welcome message",
          user: stripObjectToScalars(member.user),
        });
      }
    }

    if (config.send_to_channel) {
      const channel = meta.args.guild.channels.get(config.send_to_channel);
      if (!channel || !(channel instanceof TextChannel)) return;

      try {
        await createChunkedMessage(channel, formatted);
      } catch {
        pluginData.state.logs.log(LogType.BOT_ALERT, {
          body: `Failed send a welcome message for {userMention(member)} to {channelMention(channel)}`,
          member: stripObjectToScalars(member),
          channel: stripObjectToScalars(channel),
        });
      }
    }
  },
});
