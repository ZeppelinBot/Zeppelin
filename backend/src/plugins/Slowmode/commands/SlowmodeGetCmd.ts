import { TextChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { slowmodeCmd } from "../types";

export const SlowmodeGetCmd = slowmodeCmd({
  trigger: "slowmode",
  permission: "can_manage",
  source: "guild",

  signature: {
    channel: ct.textChannel({ option: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const channel = args.channel || (msg.channel as TextChannel);

    let currentSlowmode = channel.rateLimitPerUser;
    let isNative = true;

    if (!currentSlowmode) {
      const botSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
      if (botSlowmode) {
        currentSlowmode = botSlowmode.slowmode_seconds;
        isNative = false;
      }
    }

    if (currentSlowmode) {
      const humanized = humanizeDuration(channel.rateLimitPerUser * 1000);
      const slowmodeType = isNative ? "native" : "bot-maintained";
      msg.channel.send(`The current slowmode of <#${channel.id}> is **${humanized}** (${slowmodeType})`);
    } else {
      msg.channel.send("Channel is not on slowmode");
    }
  },
});
