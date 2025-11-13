import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildTags } from "../../data/GuildTags.js";
import { zBoundedCharacters, zStrictMessageContent } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zTag = z.union([zBoundedCharacters(0, 4000), zStrictMessageContent]);
export type TTag = z.infer<typeof zTag>;

export const zTagCategory = z
  .strictObject({
    prefix: z.string().nullable().default(null),
    delete_with_command: z.boolean().default(false),

    user_tag_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Per user, per tag
    user_category_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Per user, per tag category
    global_tag_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Any user, per tag
    allow_mentions: z.boolean().nullable().default(null),
    global_category_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Any user, per category
    auto_delete_command: z.boolean().nullable().default(null),

    tags: z.record(z.string(), zTag),

    can_use: z.boolean().nullable().default(null),
  })
  .refine((parsed) => !(parsed.auto_delete_command && parsed.delete_with_command), {
    message: "Cannot have both (category specific) delete_with_command and auto_delete_command enabled",
  });
export type TTagCategory = z.infer<typeof zTagCategory>;

export const zTagsConfig = z
  .strictObject({
    prefix: z.string().default("!!"),
    delete_with_command: z.boolean().default(true),

    user_tag_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Per user, per tag
    global_tag_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Any user, per tag
    user_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Per user
    allow_mentions: z.boolean().default(false), // Per user
    global_cooldown: z.union([z.string(), z.number()]).nullable().default(null), // Any tag use
    auto_delete_command: z.boolean().default(false), // Any tag

    categories: z.record(z.string(), zTagCategory).default({}),

    can_create: z.boolean().default(false),
    can_use: z.boolean().default(false),
    can_list: z.boolean().default(false),
  })
  .refine((parsed) => !(parsed.auto_delete_command && parsed.delete_with_command), {
    message: "Cannot have both (category specific) delete_with_command and auto_delete_command enabled",
  });

export interface TagsPluginType extends BasePluginType {
  configSchema: typeof zTagsConfig;
  state: {
    archives: GuildArchives;
    tags: GuildTags;
    savedMessages: GuildSavedMessages;
    logs: GuildLogs;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

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

export const tagsCmd = guildPluginMessageCommand<TagsPluginType>();
export const tagsEvt = guildPluginEventListener<TagsPluginType>();
