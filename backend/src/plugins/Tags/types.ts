import * as t from "io-ts";
import { BasePluginType, command, eventListener } from "knub";
import { tNullable, tEmbed } from "src/utils";
import { GuildArchives } from "src/data/GuildArchives";
import { GuildTags } from "src/data/GuildTags";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildLogs } from "src/data/GuildLogs";

export const Tag = t.union([t.string, tEmbed]);

const TagCategory = t.type({
  prefix: tNullable(t.string),
  delete_with_command: tNullable(t.boolean),

  user_tag_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag
  user_category_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag category
  global_tag_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per tag
  global_category_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per category

  tags: t.record(t.string, Tag),

  can_use: tNullable(t.boolean),
});

export const ConfigSchema = t.type({
  prefix: t.string,
  delete_with_command: t.boolean,

  user_tag_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag
  global_tag_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per tag
  user_cooldown: tNullable(t.union([t.string, t.number])), // Per user
  global_cooldown: tNullable(t.union([t.string, t.number])), // Any tag use

  categories: t.record(t.string, TagCategory),

  can_create: t.boolean,
  can_use: t.boolean,
  can_list: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface TagsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    archives: GuildArchives;
    tags: GuildTags;
    savedMessages: GuildSavedMessages;
    logs: GuildLogs;

    onMessageCreateFn;
    onMessageDeleteFn;

    tagFunctions: any;
  };
}

export const tagsCmd = command<TagsPluginType>();
export const tagsEvent = eventListener<TagsPluginType>();
