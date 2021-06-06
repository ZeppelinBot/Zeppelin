import { PluginOptions } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildScheduledPosts } from "../../data/GuildScheduledPosts";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { EditCmd } from "./commands/EditCmd";
import { EditEmbedCmd } from "./commands/EditEmbedCmd";
import { PostCmd } from "./commands/PostCmd";
import { PostEmbedCmd } from "./commands/PostEmbedCmd";
import { ScheduledPostsDeleteCmd } from "./commands/SchedluedPostsDeleteCmd";
import { ScheduledPostsListCmd } from "./commands/ScheduledPostsListCmd";
import { ScheduledPostsShowCmd } from "./commands/ScheduledPostsShowCmd";
import { ConfigSchema, PostPluginType } from "./types";
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

export const PostPlugin = zeppelinGuildPlugin<PostPluginType>()({
  name: "post",
  showInDocs: true,
  info: {
    prettyName: "Post",
  },

  dependencies: [TimeAndDatePlugin],
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

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.scheduledPosts = GuildScheduledPosts.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);
  },

  afterLoad(pluginData) {
    scheduledPostLoop(pluginData);
  },

  beforeUnload(pluginData) {
    clearTimeout(pluginData.state.scheduledPostLoopTimeout);
  },
});
