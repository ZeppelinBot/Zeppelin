import { guildPlugin } from "vety";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildScheduledPosts } from "../../data/GuildScheduledPosts.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { EditCmd } from "./commands/EditCmd.js";
import { EditEmbedCmd } from "./commands/EditEmbedCmd.js";
import { PostCmd } from "./commands/PostCmd.js";
import { PostEmbedCmd } from "./commands/PostEmbedCmd.js";
import { ScheduledPostsDeleteCmd } from "./commands/ScheduledPostsDeleteCmd.js";
import { ScheduledPostsListCmd } from "./commands/ScheduledPostsListCmd.js";
import { ScheduledPostsShowCmd } from "./commands/ScheduledPostsShowCmd.js";
import { PostPluginType, zPostConfig } from "./types.js";
import { postScheduledPost } from "./util/postScheduledPost.js";

export const PostPlugin = guildPlugin<PostPluginType>()({
  name: "post",

  dependencies: () => [TimeAndDatePlugin, LogsPlugin],
  configSchema: zPostConfig,
  defaultOverrides: [
    {
      level: ">=100",
      config: {
        can_post: true,
      },
    },
  ],

  // prettier-ignore
  messageCommands: [
      PostCmd,
      PostEmbedCmd,
      EditCmd,
      EditEmbedCmd,
      ScheduledPostsShowCmd,
      ScheduledPostsListCmd,
      ScheduledPostsDeleteCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.scheduledPosts = GuildScheduledPosts.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.unregisterGuildEventListener = onGuildEvent(guild.id, "scheduledPost", (post) =>
      postScheduledPost(pluginData, post),
    );
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.unregisterGuildEventListener?.();
  },
});
