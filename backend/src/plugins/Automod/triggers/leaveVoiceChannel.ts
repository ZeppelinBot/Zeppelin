import * as t from "io-ts";
import { automodTrigger } from "../helpers";

interface LeaveVoiceChannelResult {
  matchedChannelId: string;
}

export const LeaveVoiceChannelTrigger = automodTrigger<LeaveVoiceChannelResult>()({
  configType: t.union([t.string, t.array(t.string)]),

  defaultConfig: "",

  async match({ triggerConfig, context }) {
    if (!context.member || !context.voiceChannel) {
      return;
    }

    const triggerChannels = Array.isArray(triggerConfig) ? triggerConfig : [triggerConfig];
    if (!triggerChannels.includes(context.voiceChannel.id)) {
      return;
    }

    return {
      extra: {
        matchedChannelId: context.voiceChannel.id,
      },
    };
  },

  renderMatchInformation({ matchResult, pluginData, contexts }) {
    const channel = pluginData.guild.channels.get(matchResult.extra.matchedChannelId);
    const channelName = channel?.name || "Unknown";
    const member = contexts[0].member!;
    const memberName = `**${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
    return `${memberName} has left the ${channelName} (\`${matchResult.extra.matchedChannelId}\`) voice channel`;
  },
});
