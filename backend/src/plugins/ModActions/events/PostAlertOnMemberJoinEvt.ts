import { Permissions, Snowflake, TextChannel } from "discord.js";
import { LogType } from "../../../data/LogType";
import { resolveMember } from "../../../utils";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { modActionsEvt } from "../types";

/**
 * Show an alert if a member with prior notes joins the server
 */
export const PostAlertOnMemberJoinEvt = modActionsEvt({
  event: "guildMemberAdd",
  async listener({ pluginData, args: { member } }) {
    const config = pluginData.config.get();

    if (!config.alert_on_rejoin) return;

    const alertChannelId = config.alert_channel;
    if (!alertChannelId) return;

    const actions = await pluginData.state.cases.getByUserId(member.id);
    const logs = pluginData.getPlugin(LogsPlugin);

    if (actions.length) {
      const alertChannel = pluginData.guild.channels.cache.get(alertChannelId as Snowflake);
      if (!alertChannel) {
        logs.log(LogType.BOT_ALERT, {
          body: `Unknown \`alert_channel\` configured for \`mod_actions\`: \`${alertChannelId}\``,
        });
        return;
      }

      if (!(alertChannel instanceof TextChannel)) {
        logs.log(LogType.BOT_ALERT, {
          body: `Non-text channel configured as \`alert_channel\` in \`mod_actions\`: \`${alertChannelId}\``,
        });
        return;
      }

      const botMember = await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user!.id);
      const botPerms = alertChannel.permissionsFor(botMember ?? pluginData.client.user!.id);
      if (!hasDiscordPermissions(botPerms, Permissions.FLAGS.SEND_MESSAGES)) {
        logs.log(LogType.BOT_ALERT, {
          body: `Missing "Send Messages" permissions for the \`alert_channel\` configured in \`mod_actions\`: \`${alertChannelId}\``,
        });
        return;
      }

      await alertChannel.send(
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${actions.length} prior record(s)`,
      );
    }
  },
});
