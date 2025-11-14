import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildStarboardMessages } from "../../data/GuildStarboardMessages.js";
import { GuildStarboardReactions } from "../../data/GuildStarboardReactions.js";
import { zBoundedRecord, zSnowflake } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

const zStarboardOpts = z.strictObject({
  channel_id: zSnowflake,
  stars_required: z.number(),
  star_emoji: z.array(z.string()).default(["⭐"]),
  allow_selfstars: z.boolean().default(false),
  copy_full_embed: z.boolean().default(false),
  enabled: z.boolean().default(true),
  show_star_count: z.boolean().default(true),
  color: z.number().nullable().default(null),
});
export type TStarboardOpts = z.infer<typeof zStarboardOpts>;

export const zStarboardConfig = z.strictObject({
  boards: zBoundedRecord(z.record(z.string(), zStarboardOpts), 0, 100).default({}),
  can_migrate: z.boolean().default(false),
});

export interface StarboardPluginType extends BasePluginType {
  configSchema: typeof zStarboardConfig;
  state: {
    savedMessages: GuildSavedMessages;
    starboardMessages: GuildStarboardMessages;
    starboardReactions: GuildStarboardReactions;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

    onMessageDeleteFn;
  };
}

export const starboardCmd = guildPluginMessageCommand<StarboardPluginType>();
export const starboardEvt = guildPluginEventListener<StarboardPluginType>();
