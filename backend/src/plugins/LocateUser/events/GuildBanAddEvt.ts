import { locateUserEvent } from "../types";

export const GuildBanAddEvt = locateUserEvent({
  event: "guildBanAdd",

  async listener(meta) {
    const alerts = await meta.pluginData.state.alerts.getAlertsByUserId(meta.args.user.id);
    alerts.forEach(alert => {
      meta.pluginData.state.alerts.delete(alert.id);
    });
  },
});
