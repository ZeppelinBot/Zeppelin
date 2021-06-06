import humanizeDuration from "humanize-duration";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { MINUTES, SECONDS } from "../../../utils";
import { locateUserCmd } from "../types";

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
      sendErrorMessage(pluginData, msg.channel, "Sorry, but the minimum duration for an alert is 30 seconds!");
      return;
    }

    await pluginData.state.alerts.add(
      msg.author.id,
      args.member.id,
      msg.channel.id,
      alertTime.format("YYYY-MM-DD HH:mm:ss"),
      body,
      active,
    );
    if (!pluginData.state.usersWithAlerts.includes(args.member.id)) {
      pluginData.state.usersWithAlerts.push(args.member.id);
    }

    if (active) {
      sendSuccessMessage(
        pluginData,
        msg.channel,
        `Every time <@${args.member.id}> joins or switches VC in the next ${humanizeDuration(
          time,
        )} i will notify and move you.\nPlease make sure to be in a voice channel, otherwise i cannot move you!`,
      );
    } else {
      sendSuccessMessage(
        pluginData,
        msg.channel,
        `Every time <@${args.member.id}> joins or switches VC in the next ${humanizeDuration(time)} i will notify you`,
      );
    }
  },
});
