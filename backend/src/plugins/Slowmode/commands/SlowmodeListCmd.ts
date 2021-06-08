import { GuildChannel, TextChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { createChunkedMessage } from "knub/dist/helpers";
import { errorMessage } from "../../../utils";
import { slowmodeCmd } from "../types";

export const SlowmodeListCmd = slowmodeCmd({
  trigger: ["slowmode list", "slowmode l", "slowmodes"],
  permission: "can_manage",

  async run({ message: msg, pluginData }) {
    const channels = pluginData.guild.channels;
    const slowmodes: Array<{ channel: GuildChannel; seconds: number; native: boolean }> = [];

    for (const channel of channels.cache.values()) {
      if (!(channel instanceof TextChannel)) continue;

      // Bot slowmode
      const botSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
      if (botSlowmode) {
        slowmodes.push({ channel, seconds: botSlowmode.slowmode_seconds, native: false });
        continue;
      }

      // Native slowmode
      if (channel.rateLimitPerUser) {
        slowmodes.push({ channel, seconds: channel.rateLimitPerUser, native: true });
        continue;
      }
    }

    if (slowmodes.length) {
      const lines = slowmodes.map(slowmode => {
        const humanized = humanizeDuration(slowmode.seconds * 1000);

        const type = slowmode.native ? "native slowmode" : "bot slowmode";

        return `<#${slowmode.channel.id}> **${humanized}** ${type}`;
      });

      createChunkedMessage(msg.channel, lines.join("\n"));
    } else {
      msg.channel.send(errorMessage("No active slowmodes!"));
    }
  },
});
