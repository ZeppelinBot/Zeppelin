import { locateUserEvt } from "../types";

export const GuildBanRemoveAlertsEvt = locateUserEvt({
  event: "guildBanAdd",

  async listener(meta) {
    const alerts = await meta.pluginData.state.alerts.getAlertsByUserId(meta.args.user.id);
    for (let i = 0; i < alerts.length; ++i) {
      meta.pluginData.state.alerts.delete(alerts[i].id);
    }
  },
});
