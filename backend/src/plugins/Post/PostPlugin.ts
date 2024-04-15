import { PluginOptions, guildPlugin } from "knub";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildScheduledPosts } from "../../data/GuildScheduledPosts";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { EditCmd } from "./commands/EditCmd";
import { EditEmbedCmd } from "./commands/EditEmbedCmd";
import { PostCmd } from "./commands/PostCmd";
import { PostEmbedCmd } from "./commands/PostEmbedCmd";
import { ScheduledPostsDeleteCmd } from "./commands/ScheduledPostsDeleteCmd";
import { ScheduledPostsListCmd } from "./commands/ScheduledPostsListCmd";
import { ScheduledPostsShowCmd } from "./commands/ScheduledPostsShowCmd";
import { PostPluginType, zPostConfig } from "./types";
import { postScheduledPost } from "./util/postScheduledPost";
import { CommonPlugin } from "../Common/CommonPlugin";

const defaultOptions: PluginOptions<PostPluginType> = {
  config: {
    can_post: false,
  },
  overrides: [
    {
      level: ">=100",
      config: {
        can_post: true,
      },
    },
  ],
};

export const PostPlugin = guildPlugin<PostPluginType>()({
  name: "post",

  dependencies: () => [TimeAndDatePlugin, LogsPlugin],
  configParser: (input) => zPostConfig.parse(input),
  defaultOptions,

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
