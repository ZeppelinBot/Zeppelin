import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { registerExpiringVCAlert } from "../../../data/loops/expiringVCAlertsLoop.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { MINUTES, SECONDS } from "../../../utils.js";
import { locateUserCmd } from "../types.js";

export const FollowCmd = locateUserCmd({
  trigger: ["follow", "f"],
  description: "Sets up an alert that notifies you any time `<member>` switches or joins voice channels",
  usage: "!f 108552944961454080",
  permission: "can_alert",

  signature: {
    member: ct.resolvedMember(),
    reminder: ct.string({ required: false, catchAll: true }),

    duration: ct.delay({ option: true, shortcut: "d" }),
    active: ct.bool({ option: true, shortcut: "a", isSwitch: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const time = args.duration || 10 * MINUTES;
    const alertTime = moment.utc().add(time, "millisecond");
    const body = args.reminder || "None";
    const active = args.active || false;

    if (time < 30 * SECONDS) {
      void pluginData.state.common.sendErrorMessage(msg, "Sorry, but the minimum duration for an alert is 30 seconds!");
      return;
    }

    const alert = await pluginData.state.alerts.add(
      msg.author.id,
      args.member.id,
      msg.channel.id,
      alertTime.format("YYYY-MM-DD HH:mm:ss"),
      body,
      active,
    );
    registerExpiringVCAlert(alert);

    if (!pluginData.state.usersWithAlerts.includes(args.member.id)) {
      pluginData.state.usersWithAlerts.push(args.member.id);
    }

    if (active) {
      void pluginData.state.common.sendSuccessMessage(
        msg,
        `Every time <@${args.member.id}> joins or switches VC in the next ${humanizeDuration(
          time,
        )} i will notify and move you.\nPlease make sure to be in a voice channel, otherwise i cannot move you!`,
      );
    } else {
      void pluginData.state.common.sendSuccessMessage(
        msg,
        `Every time <@${args.member.id}> joins or switches VC in the next ${humanizeDuration(time)} i will notify you`,
      );
    }
  },
});
