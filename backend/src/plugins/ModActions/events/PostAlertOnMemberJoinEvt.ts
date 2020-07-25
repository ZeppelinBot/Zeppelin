import { eventListener } from "knub";
import { ModActionsPluginType } from "../types";

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
      alertChannel.send(
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${actions.length} prior record(s)`,
      );
    }
  },
);
