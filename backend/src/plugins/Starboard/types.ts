import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildStarboardMessages } from "../../data/GuildStarboardMessages";
import { GuildStarboardReactions } from "../../data/GuildStarboardReactions";
import { tDeepPartial, tNullable } from "../../utils";

const StarboardOpts = t.type({
  channel_id: t.string,
  stars_required: t.number,
  star_emoji: tNullable(t.array(t.string)),
  allow_selfstars: tNullable(t.boolean),
  copy_full_embed: tNullable(t.boolean),
  enabled: tNullable(t.boolean),
  show_star_count: t.boolean,
  color: tNullable(t.number),
});
export type TStarboardOpts = t.TypeOf<typeof StarboardOpts>;

export const ConfigSchema = t.type({
  boards: t.record(t.string, StarboardOpts),
  can_migrate: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export const PartialConfigSchema = tDeepPartial(ConfigSchema);

export const defaultStarboardOpts: Partial<TStarboardOpts> = {
  star_emoji: ["⭐"],
  enabled: true,
  show_star_count: true,
  color: null,
};

export interface StarboardPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    savedMessages: GuildSavedMessages;
    starboardMessages: GuildStarboardMessages;
    starboardReactions: GuildStarboardReactions;

    onMessageDeleteFn;
  };
}

export const starboardCmd = typedGuildCommand<StarboardPluginType>();
export const starboardEvt = typedGuildEventListener<StarboardPluginType>();
