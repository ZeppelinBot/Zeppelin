import { Snowflake, TextChannel, ThreadChannel } from "discord.js";
import * as t from "io-ts";
import { ChannelTypeStrings } from "../../../types";
import { convertDelayStringToMS, isDiscordAPIError, tDelayString, tNullable } from "../../../utils";
import { automodAction } from "../helpers";
import { LogsPlugin } from "../../Logs/LogsPlugin";

export const SetSlowmodeAction = automodAction({
  configType: t.type({
    channels: tNullable(t.array(t.string)),
    duration: tNullable(tDelayString),
  }),

  defaultConfig: {
    duration: "10s",
  },

  async apply({ pluginData, actionConfig, contexts }) {
    const slowmodeMs = Math.max(actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : 0, 0);
    const channels: string[] = actionConfig.channels ?? [];
    if (channels.length === 0) {
      channels.push(...contexts.filter(c => c.message?.channel_id).map(c => c.message!.channel_id));
    }
    for (const channelId of channels) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      // Only text channels and text channels within categories support slowmodes
      if (!channel?.isText() && channel?.type !== ChannelTypeStrings.CATEGORY) continue;

      const channelsToSlowmode: Array<TextChannel | ThreadChannel> = [];
      if (channel.type === ChannelTypeStrings.CATEGORY) {
        // Find all text channels within the category
        for (const ch of pluginData.guild.channels.cache.values()) {
          if (ch.parentId === channel.id && ch.type === ChannelTypeStrings.TEXT) {
            channelsToSlowmode.push(ch as TextChannel);
          }
        }
      } else {
        channelsToSlowmode.push(channel as TextChannel);
      }

      const slowmodeSeconds = Math.ceil(slowmodeMs / 1000);

      try {
        for (const chan of channelsToSlowmode) {
          await chan.edit({
            rateLimitPerUser: slowmodeSeconds,
          });
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
