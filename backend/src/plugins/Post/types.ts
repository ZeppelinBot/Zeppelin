import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildScheduledPosts } from "../../data/GuildScheduledPosts";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zPostConfig = z.strictObject({
  can_post: z.boolean(),
});

export interface PostPluginType extends BasePluginType {
  config: z.infer<typeof zPostConfig>;
  state: {
    savedMessages: GuildSavedMessages;
    scheduledPosts: GuildScheduledPosts;
    logs: GuildLogs;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

    unregisterGuildEventListener: () => void;
  };
}

export const postCmd = guildPluginMessageCommand<PostPluginType>();
