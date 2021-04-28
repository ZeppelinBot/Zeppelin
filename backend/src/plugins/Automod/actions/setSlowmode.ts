import * as t from "io-ts";
import { automodAction } from "../helpers";
import { convertDelayStringToMS, isDiscordRESTError, tDelayString, tNullable } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { AnyGuildChannel } from "eris";

export const SetSlowmodeAction = automodAction({
  configType: t.type({
    channels: t.array(t.string),
    duration: tNullable(tDelayString),
  }),

  defaultConfig: {
    duration: "10s",
  },

  async apply({ pluginData, actionConfig }) {
    const duration = actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : 0;

    for (const channelId of actionConfig.channels) {
      const channel = pluginData.guild.channels.get(channelId);
      // 0 = Guild Text, 4 = Guild Category - Both dont allow slowmode
      if (!channel) continue;
      if (!(channel.type === 0 || channel.type === 4)) continue;

      let channelsToSlowmode: AnyGuildChannel[] = [];
      if (channel.type === 4) {
        channelsToSlowmode = pluginData.guild.channels.filter(ch => ch.parentID === channel.id && ch.type === 0);
      } else {
        channelsToSlowmode.push(channel);
      }

      try {
        for (const chan of channelsToSlowmode) {
          await chan.edit({
            rateLimitPerUser: duration / 1000, // ms -> seconds
          });
        }
      } catch (e) {
        let errorMessage = e;

        // Check for invalid form body -> indicates duration was too large
        if (isDiscordRESTError(e) && e.code === 50035) {
          errorMessage = `Duration is greater than maximum native slowmode duration`;
        }

        pluginData.state.logs.log(LogType.BOT_ALERT, {
          body: `Unable to set slowmode for channel ${channel.id} to ${duration / 1000} seconds: ${errorMessage}`,
        });
      }
    }
  },
});
