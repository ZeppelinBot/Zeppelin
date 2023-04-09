import * as t from "io-ts";
import { BasePluginType, guildPluginMessageCommand } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildScheduledPosts } from "../../data/GuildScheduledPosts";

export const ConfigSchema = t.type({
  can_post: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface PostPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    savedMessages: GuildSavedMessages;
    scheduledPosts: GuildScheduledPosts;
    logs: GuildLogs;

    unregisterGuildEventListener: () => void;
  };
}

export const postCmd = guildPluginMessageCommand<PostPluginType>();
