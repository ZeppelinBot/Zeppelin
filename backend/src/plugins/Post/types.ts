import * as t from "io-ts";
import { BasePluginType, command } from "knub";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildScheduledPosts } from "src/data/GuildScheduledPosts";
import { GuildLogs } from "src/data/GuildLogs";

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

    scheduledPostLoopTimeout: NodeJS.Timeout;
  };
}

export const postCmd = command<PostPluginType>();
