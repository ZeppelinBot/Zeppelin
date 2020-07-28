import { PluginData } from "knub";
import { CompanionChannelsPluginType, TCompanionChannelOpts } from "../types";

const defaultCompanionChannelOpts: Partial<TCompanionChannelOpts> = {
  enabled: true,
};

export function getCompanionChannelOptsForVoiceChannelId(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId: string,
): TCompanionChannelOpts[] {
  const config = pluginData.config.getMatchingConfig({ userId, channelId: voiceChannelId });
  return Object.values(config.entries)
    .filter(opts => opts.voice_channel_ids.includes(voiceChannelId))
    .map(opts => Object.assign({}, defaultCompanionChannelOpts, opts));
}
