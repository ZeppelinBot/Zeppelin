import { modActionsEvt } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import { Constants, TextChannel } from "eris";
import { resolveMember } from "../../../utils";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";

/**
 * Show an alert if a member with prior notes joins the server
 */
export const PostAlertOnMemberJoinEvt = modActionsEvt(
  "guildMemberAdd",
  async ({ pluginData, args: { guild, member } }) => {
    const config = pluginData.config.get();

    if (!config.alert_on_rejoin) return;

    const alertChannelId = config.alert_channel;
    if (!alertChannelId) return;

    const actions = await pluginData.state.cases.getByUserId(member.id);
    const logs = pluginData.getPlugin(LogsPlugin);

    if (actions.length) {
      const alertChannel = pluginData.guild.channels.get(alertChannelId);
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

      const botMember = await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user.id);
      const botPerms = alertChannel.permissionsOf(botMember ?? pluginData.client.user.id);
      if (!hasDiscordPermissions(botPerms, Constants.Permissions.sendMessages)) {
        logs.log(LogType.BOT_ALERT, {
          body: `Missing "Send Messages" permissions for the \`alert_channel\` configured in \`mod_actions\`: \`${alertChannelId}\``,
        });
        return;
      }

      await alertChannel.createMessage(
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${actions.length} prior record(s)`,
      );
    }
  },
);
