import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, PostPluginType } from "./types";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildScheduledPosts } from "src/data/GuildScheduledPosts";
import { GuildLogs } from "src/data/GuildLogs";
import { PostCmd } from "./commands/PostCmd";
import { PostEmbedCmd } from "./commands/PostEmbedCmd";
import { EditCmd } from "./commands/EditCmd";
import { EditEmbedCmd } from "./commands/EditEmbedCmd";
import { ScheduledPostsShowCmd } from "./commands/ScheduledPostsShowCmd";
import { ScheduledPostsListCmd } from "./commands/ScheduledPostsListCmd";
import { ScheduledPostsDeleteCmd } from "./commands/SchedluedPostsDeleteCmd";
import { scheduledPostLoop } from "./util/scheduledPostLoop";

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

export const PostPlugin = zeppelinPlugin<PostPluginType>()("post", {
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
      PostCmd,
      PostEmbedCmd,
      EditCmd,
      EditEmbedCmd,
      ScheduledPostsShowCmd,
      ScheduledPostsListCmd,
      ScheduledPostsDeleteCmd,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.scheduledPosts = GuildScheduledPosts.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);

    scheduledPostLoop(pluginData);
  },

  onUnload(pluginData) {
    clearTimeout(pluginData.state.scheduledPostLoopTimeout);
  },
});
