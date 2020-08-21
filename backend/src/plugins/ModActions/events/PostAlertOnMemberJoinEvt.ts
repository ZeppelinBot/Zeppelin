import { eventListener } from "knub";
import { ModActionsPluginType } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";

/**
 * Show an alert if a member with prior notes joins the server
 */
export const PostAlertOnMemberJoinEvt = eventListener<ModActionsPluginType>()(
  "guildMemberAdd",
  async ({ pluginData, args: { guild, member } }) => {
    const config = pluginData.config.get();

    if (!config.alert_on_rejoin) return;

    const alertChannelId = config.alert_channel;
    if (!alertChannelId) return;

    const actions = await pluginData.state.cases.getByUserId(member.id);

    if (actions.length) {
      const alertChannel: any = pluginData.guild.channels.get(alertChannelId);
      if (!alertChannel) {
        pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
          body: `Unknown \`alert_channel\` configured for \`mod_actions\`: \`${alertChannelId}\``,
        });
        return;
      }

      alertChannel.send(
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${actions.length} prior record(s)`,
      );
    }
  },
);
