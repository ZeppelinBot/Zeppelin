import { welcomeEvent } from "../types";
import { renderTemplate } from "src/templateFormatter";
import { stripObjectToScalars, createChunkedMessage } from "src/utils";
import { LogType } from "src/data/LogType";
import { TextChannel } from "eris";

export const GuildMemberAddEvt = welcomeEvent({
  event: "guildMemberAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const member = meta.args.member;

    const config = pluginData.config.get();
    if (!config.message) return;
    if (!config.send_dm && !config.send_to_channel) return;

    const formatted = await renderTemplate(config.message, {
      member: stripObjectToScalars(member, ["user"]),
    });

    if (config.send_dm) {
      const dmChannel = await member.user.getDMChannel();
      if (!dmChannel) return;

      try {
        await createChunkedMessage(dmChannel, formatted);
      } catch (e) {
        pluginData.state.logs.log(LogType.BOT_ALERT, {
          body: `Failed send a welcome DM to {userMention(member)}`,
          member: stripObjectToScalars(member),
        });
      }
    }

    if (config.send_to_channel) {
      const channel = meta.args.guild.channels.get(config.send_to_channel);
      if (!channel || !(channel instanceof TextChannel)) return;

      try {
        await createChunkedMessage(channel, formatted);
      } catch (e) {
        pluginData.state.logs.log(LogType.BOT_ALERT, {
          body: `Failed send a welcome message for {userMention(member)} to {channelMention(channel)}`,
          member: stripObjectToScalars(member),
          channel: stripObjectToScalars(channel),
        });
      }
    }
  },
});
