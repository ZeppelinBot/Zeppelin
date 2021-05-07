import { Constants } from "eris";
import * as t from "io-ts";
import { automodTrigger } from "../helpers";

interface LeaveVoiceChannelResult {
  matchedChannelId: string;
}

export const LeaveVoiceChannelTrigger = automodTrigger<LeaveVoiceChannelResult>()({
  configType: t.union([t.string, t.array(t.string)]),

  defaultConfig: "",

  async match({ triggerConfig, context }) {
    const matchedChannelId = context.voiceChannel?.left?.id;
    if (!context.member || !matchedChannelId) {
      return;
    }

    const triggerChannels = Array.isArray(triggerConfig) ? triggerConfig : [triggerConfig];
    if (!triggerChannels.includes(matchedChannelId)) {
      return;
    }

    return {
      extra: {
        matchedChannelId,
      },
    };
  },

  renderMatchInformation({ matchResult, pluginData, contexts }) {
    const channel = pluginData.guild.channels.get(matchResult.extra.matchedChannelId);
    const channelName = channel?.name || "Unknown";
    const member = contexts[0].member!;
    const memberName = `**${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
    const voiceOrStage = channel?.type === Constants.ChannelTypes.GUILD_STAGE ? "stage" : "voice";
    return `${memberName} has left the ${channelName} (\`${matchResult.extra.matchedChannelId}\`) ${voiceOrStage} channel`;
  },
});
