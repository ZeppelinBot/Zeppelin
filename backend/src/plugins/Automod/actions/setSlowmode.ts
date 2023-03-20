import { ChannelType, GuildTextBasedChannel, Snowflake } from "discord.js";
import * as t from "io-ts";
import { convertDelayStringToMS, isDiscordAPIError, tDelayString, tNullable } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { automodAction } from "../helpers";

export const SetSlowmodeAction = automodAction({
  configType: t.type({
    channels: t.array(t.string),
    duration: tNullable(tDelayString),
  }),

  defaultConfig: {
    duration: "10s",
  },

  async apply({ pluginData, actionConfig }) {
    const slowmodeMs = Math.max(actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : 0, 0);

    for (const channelId of actionConfig.channels) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);

      // Only text channels and text channels within categories support slowmodes
      if (!channel || (!channel.isTextBased() && channel.type !== ChannelType.GuildCategory)) {
        continue;
      }

      const channelsToSlowmode: GuildTextBasedChannel[] = [];
      if (channel.type === ChannelType.GuildCategory) {
        // Find all text channels within the category
        for (const ch of pluginData.guild.channels.cache.values()) {
          if (ch.parentId === channel.id && ch.type === ChannelType.GuildText) {
            channelsToSlowmode.push(ch);
          }
        }
      } else {
        channelsToSlowmode.push(channel);
      }

      const slowmodeSeconds = Math.ceil(slowmodeMs / 1000);

      try {
        for (const chan of channelsToSlowmode) {
          await chan.setRateLimitPerUser(slowmodeSeconds);
        }
      } catch (e) {
        // Check for invalid form body -> indicates duration was too large
        const errorMessage =
          isDiscordAPIError(e) && e.code === 50035
            ? `Duration is greater than maximum native slowmode duration`
            : e.message;

        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Unable to set slowmode for channel ${channel.id} to ${slowmodeSeconds} seconds: ${errorMessage}`,
        });
      }
    }
  },
});
