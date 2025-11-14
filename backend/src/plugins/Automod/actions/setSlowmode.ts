import { ChannelType, GuildTextBasedChannel, Snowflake } from "discord.js";
import { z } from "zod";
import { convertDelayStringToMS, isDiscordAPIError, zDelayString, zSnowflake } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

export const SetSlowmodeAction = automodAction({
  configSchema: z.strictObject({
    channels: z.array(zSnowflake).nullable().default([]),
    duration: zDelayString.nullable().default("10s"),
  }),

  async apply({ pluginData, actionConfig, contexts }) {
    const slowmodeMs = Math.max(actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : 0, 0);
    const channels: Snowflake[] = actionConfig.channels ?? [];
    if (channels.length === 0) {
      channels.push(...contexts.filter((c) => c.message?.channel_id).map((c) => c.message!.channel_id));
    }
    for (const channelId of channels) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      // Only text channels and text channels within categories support slowmodes

      if (!channel?.isTextBased() && channel?.type !== ChannelType.GuildCategory) {
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
