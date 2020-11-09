import { VoiceChannel } from "eris";
import { GuildPluginData } from "knub";
import { CompanionChannelsPluginType, TCompanionChannelOpts } from "../types";

const defaultCompanionChannelOpts: Partial<TCompanionChannelOpts> = {
  enabled: true,
};

export function getCompanionChannelOptsForVoiceChannelId(
  pluginData: GuildPluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannel: VoiceChannel,
): TCompanionChannelOpts[] {
  const config = pluginData.config.getMatchingConfig({ userId, channelId: voiceChannel.id });
  return Object.values(config.entries)
    .filter(
      opts =>
        opts.voice_channel_ids.includes(voiceChannel.id) ||
        (voiceChannel.parentID && opts.voice_channel_ids.includes(voiceChannel.parentID)),
    )
    .map(opts => Object.assign({}, defaultCompanionChannelOpts, opts));
}
