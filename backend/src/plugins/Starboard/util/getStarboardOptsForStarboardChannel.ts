import { TStarboardOpts, StarboardPluginType, defaultStarboardOpts } from "../types";
import { PluginData } from "knub";

export function getStarboardOptsForStarboardChannel(
  pluginData: PluginData<StarboardPluginType>,
  starboardChannel,
): TStarboardOpts[] {
  const config = pluginData.config.getForChannel(starboardChannel);

  const configs = Object.values(config.boards).filter(opts => opts.channel_id === starboardChannel.id);
  configs.forEach(cfg => {
    if (cfg.enabled == null) cfg.enabled = defaultStarboardOpts.enabled;
    if (cfg.star_emoji == null) cfg.star_emoji = defaultStarboardOpts.star_emoji;
    if (cfg.stars_required == null) cfg.stars_required = defaultStarboardOpts.stars_required;
    if (cfg.copy_full_embed == null) cfg.copy_full_embed = false;
  });

  return configs;
}
