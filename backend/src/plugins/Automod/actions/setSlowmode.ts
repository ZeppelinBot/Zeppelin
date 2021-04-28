import * as t from "io-ts";
import { automodAction } from "../helpers";
import { convertDelayStringToMS, isDiscordRESTError, tDelayString, tNullable } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { Constants, TextChannel } from "eris";

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
      const channel = pluginData.guild.channels.get(channelId);

      // Only text channels and text channels within categories support slowmodes
      if (
        !channel ||
        !(channel.type === Constants.ChannelTypes.GUILD_TEXT || channel.type === Constants.ChannelTypes.GUILD_CATEGORY)
      ) {
        continue;
      }

      let channelsToSlowmode: TextChannel[] = [];
      if (channel.type === Constants.ChannelTypes.GUILD_CATEGORY) {
        // Find all text channels within the category
        channelsToSlowmode = pluginData.guild.channels.filter(
          ch => ch.parentID === channel.id && ch.type === Constants.ChannelTypes.GUILD_TEXT,
        ) as TextChannel[];
      } else {
        channelsToSlowmode.push(channel);
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
          isDiscordRESTError(e) && e.code === 50035
            ? `Duration is greater than maximum native slowmode duration`
            : e.message;

        pluginData.state.logs.log(LogType.BOT_ALERT, {
          body: `Unable to set slowmode for channel ${channel.id} to ${slowmodeSeconds} seconds: ${errorMessage}`,
        });
      }
    }
  },
});
