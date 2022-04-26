import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildTags } from "../../data/GuildTags";
import { tEmbed, tNullable } from "../../utils";

export const Tag = t.union([t.string, tEmbed]);
export type TTag = t.TypeOf<typeof Tag>;

export const TagCategory = t.type({
  prefix: tNullable(t.string),
  delete_with_command: tNullable(t.boolean),

  user_tag_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag
  user_category_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag category
  global_tag_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per tag
  allow_mentions: tNullable(t.boolean), // Per user, per category
  global_category_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per category
  auto_delete_command: tNullable(t.boolean), // Any tag, per tag category

  tags: t.record(t.string, Tag),

  can_use: tNullable(t.boolean),
});
export type TTagCategory = t.TypeOf<typeof TagCategory>;

export const ConfigSchema = t.type({
  prefix: t.string,
  delete_with_command: t.boolean,

  user_tag_cooldown: tNullable(t.union([t.string, t.number])), // Per user, per tag
  global_tag_cooldown: tNullable(t.union([t.string, t.number])), // Any user, per tag
  user_cooldown: tNullable(t.union([t.string, t.number])), // Per user
  allow_mentions: t.boolean, // Per user
  global_cooldown: tNullable(t.union([t.string, t.number])), // Any tag use
  auto_delete_command: t.boolean, // Any tag

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

    tagFunctions: any;
  };
}

export interface TemplateFunction {
  name: string;
  description: string;
  arguments: string[];
  returnValue: string;
  signature?: string;
  examples?: string[];
}

export const tagsCmd = typedGuildCommand<TagsPluginType>();
export const tagsEvt = typedGuildEventListener<TagsPluginType>();
