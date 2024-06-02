import { clearExpiringVCAlert } from "../../../data/loops/expiringVCAlertsLoop.js";
import { locateUserEvt } from "../types.js";

export const GuildBanRemoveAlertsEvt = locateUserEvt({
  event: "guildBanAdd",

  async listener(meta) {
    const alerts = await meta.pluginData.state.alerts.getAlertsByUserId(meta.args.ban.user.id);
    alerts.forEach((alert) => {
      clearExpiringVCAlert(alert);
      meta.pluginData.state.alerts.delete(alert.id);
    });
  },
});
