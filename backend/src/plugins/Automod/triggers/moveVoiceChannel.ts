import * as t from "io-ts";
import { ChannelTypeStrings } from "../../../types";
import { automodTrigger } from "../helpers";

interface MoveVoiceChannelResult {
  oldChannelId: string;
  newChannelId: string;
}

export const MoveVoiceChannelTrigger = automodTrigger<MoveVoiceChannelResult>()({
  configType: t.type({
    old_channel: t.union([t.string, t.array(t.string)]),
    new_channel: t.union([t.string, t.array(t.string)]),
  }),

  defaultConfig: {},

  async match({ triggerConfig, context }) {
    const oldChannelId = context.voiceChannel?.left?.id;
    const newChannelId = context.voiceChannel?.joined?.id;

    if (!context.member || !oldChannelId || !newChannelId) {
      return;
    }

    const triggerOldChannels = Array.isArray(triggerConfig.old_channel)
      ? triggerConfig.old_channel
      : [triggerConfig.old_channel];

    const triggerNewChannels = Array.isArray(triggerConfig.new_channel)
      ? triggerConfig.new_channel
      : [triggerConfig.new_channel];

    if (!triggerOldChannels.includes(oldChannelId) || !triggerNewChannels.includes(newChannelId)) {
      return;
    }

    return {
      extra: {
        oldChannelId,
        newChannelId,
      },
    };
  },

  renderMatchInformation({ matchResult, pluginData, contexts }) {
    const { newChannelId, oldChannelId } = matchResult.extra;
    const oldChannel = pluginData.guild.channels.resolve(oldChannelId);
    const newChannel = pluginData.guild.channels.resolve(newChannelId);
    const member = contexts[0].member!;
    const memberName = `**${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
    const oldChannelName = oldChannel?.name ?? "Unknown";
    const newChannelName = newChannel?.name ?? "Unknown";
    const oldChannelVoiceOrStage = oldChannel?.type === ChannelTypeStrings.STAGE ? "stage" : "voice";
    const newChannelVoiceOrStage = newChannel?.type === ChannelTypeStrings.STAGE ? "stage" : "voice";
    return `${memberName} has moved from the the ${oldChannelName} (\`${oldChannelId}\`) ${oldChannelVoiceOrStage} channel to the ${newChannelName} (\`${newChannelId}\`) ${newChannelVoiceOrStage} channel`;
  },
});
