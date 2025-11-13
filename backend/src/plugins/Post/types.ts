import { BasePluginType, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildScheduledPosts } from "../../data/GuildScheduledPosts.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zPostConfig = z.strictObject({
  can_post: z.boolean().default(false),
});

export interface PostPluginType extends BasePluginType {
  configSchema: typeof zPostConfig;
  state: {
    savedMessages: GuildSavedMessages;
    scheduledPosts: GuildScheduledPosts;
    logs: GuildLogs;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;

    unregisterGuildEventListener: () => void;
  };
}

export const postCmd = guildPluginMessageCommand<PostPluginType>();
