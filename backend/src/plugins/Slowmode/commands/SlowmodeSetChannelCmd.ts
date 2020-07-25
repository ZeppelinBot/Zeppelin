import { commandTypeHelpers as ct } from "../../../commandTypes";
import { slowmodeCmd } from "../types";
import { TextChannel } from "eris";
import humanizeDuration from "humanize-duration";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { convertDelayStringToMS, HOURS, DAYS } from "src/utils";
import { disableBotSlowmodeForChannel } from "../util/disableBotSlowmodeForChannel";
import { actualDisableSlowmodeCmd } from "../util/actualDisableSlowmodeCmd";

const NATIVE_SLOWMODE_LIMIT = 6 * HOURS; // 6 hours
const MAX_SLOWMODE = DAYS * 365 * 100; // 100 years

export const SlowmodeSetChannelCmd = slowmodeCmd({
  trigger: "slowmode",
  permission: "can_manage",
  source: "guild",

  // prettier-ignore
  signature: [
    {
      time: ct.string(),
    },
    {
      channel: ct.textChannel(),
      time: ct.string(),
    }
  ],

  async run({ message: msg, args, pluginData }) {
    const channel = args.channel || msg.channel;

    if (channel == null || !(channel instanceof TextChannel)) {
      sendErrorMessage(pluginData, msg.channel, "Channel must be a text channel");
      return;
    }

    const seconds = Math.ceil(convertDelayStringToMS(args.time, "s") / 1000);
    const useNativeSlowmode =
      pluginData.config.getForChannel(channel).use_native_slowmode && seconds <= NATIVE_SLOWMODE_LIMIT;

    if (seconds === 0) {
      // Workaround until we can call SlowmodeDisableCmd from here
      return actualDisableSlowmodeCmd(msg, { channel }, pluginData);
    }

    if (seconds > MAX_SLOWMODE) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `Sorry, slowmodes can be at most 100 years long. Maybe 99 would be enough?`,
      );
      return;
    }

    if (useNativeSlowmode) {
      // Native slowmode

      // If there is an existing bot-maintained slowmode, disable that first
      const existingBotSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
      if (existingBotSlowmode) {
        await disableBotSlowmodeForChannel(pluginData, channel);
      }

      // Set slowmode
      try {
        await channel.edit({
          rateLimitPerUser: seconds,
        });
      } catch (e) {
        return sendErrorMessage(pluginData, msg.channel, "Failed to set native slowmode (check permissions)");
      }
    } else {
      // Bot-maintained slowmode

      // If there is an existing native slowmode, disable that first
      if (channel.rateLimitPerUser) {
        await channel.edit({
          rateLimitPerUser: 0,
        });
      }

      await pluginData.state.slowmodes.setChannelSlowmode(channel.id, seconds);
    }

    const humanizedSlowmodeTime = humanizeDuration(seconds * 1000);
    const slowmodeType = useNativeSlowmode ? "native slowmode" : "bot-maintained slowmode";
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Set ${humanizedSlowmodeTime} slowmode for <#${channel.id}> (${slowmodeType})`,
    );
  },
});
