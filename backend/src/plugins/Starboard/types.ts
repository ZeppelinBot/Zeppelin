import * as t from "io-ts";
import { BasePluginType, command, eventListener } from "knub";
import { tNullable, tDeepPartial } from "src/utils";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildStarboardMessages } from "src/data/GuildStarboardMessages";
import { GuildStarboardReactions } from "src/data/GuildStarboardReactions";

const StarboardOpts = t.type({
  channel_id: t.string,
  stars_required: t.number,
  star_emoji: tNullable(t.array(t.string)),
  copy_full_embed: tNullable(t.boolean),
  enabled: tNullable(t.boolean),
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

export const starboardCmd = command<StarboardPluginType>();
export const starboardEvt = eventListener<StarboardPluginType>();
