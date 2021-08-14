import * as t from "io-ts";
import { ChannelTypeStrings } from "../../../types";
import { automodTrigger } from "../helpers";

interface LeaveVoiceChannelResult {
  matchedChannelId: string;
}

export const LeaveVoiceChannelTrigger = automodTrigger<LeaveVoiceChannelResult>()({
  configType: t.type({
    channels: t.union([t.string, t.array(t.string)]),
    include_moves: t.boolean,
  }),

  defaultConfig: {},

  async match({ triggerConfig, context }) {
    const matchedChannelId = context.voiceChannel?.left?.id;
    const includeMoves =
      typeof triggerConfig === "object" && !Array.isArray(triggerConfig) && triggerConfig.include_moves;

    if (!context.member || !matchedChannelId || (context.voiceChannel?.joined && !includeMoves)) {
      return;
    }

    const triggerChannels = Array.isArray(triggerConfig.channels) ? triggerConfig.channels : [triggerConfig.channels];
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
    const channel = pluginData.guild.channels.resolve(matchResult.extra.matchedChannelId);
    const channelName = channel?.name ?? "Unknown";
    const member = contexts[0].member!;
    const memberName = `**${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
    const voiceOrStage = channel?.type === ChannelTypeStrings.STAGE ? "stage" : "voice";
    return `${memberName} has left the ${channelName} (\`${matchResult.extra.matchedChannelId}\`) ${voiceOrStage} channel`;
  },
});
