import * as t from "io-ts";
import { automodTrigger } from "../helpers";
import { Constants } from "eris";

interface JoinVoiceChannelResult {
  matchedChannelId: string;
}

export const JoinVoiceChannelTrigger = automodTrigger<JoinVoiceChannelResult>()({
  configType: t.union([t.string, t.array(t.string)]),

  defaultConfig: "",

  async match({ triggerConfig, context }) {
    const matchedChannelId = context.voiceChannel?.joined?.id;
    if (!context.member || !matchedChannelId || context.voiceChannel?.left) {
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
    return `${memberName} has joined the ${channelName} (\`${matchResult.extra.matchedChannelId}\`) ${voiceOrStage} channel`;
  },
});
