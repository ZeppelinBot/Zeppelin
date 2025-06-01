import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { sorter } from "../../../utils.js";
import { postCmd } from "../types.js";
import { postMessage } from "../util/postMessage.js";

export const ScheduledPostsShowCmd = postCmd({
  trigger: ["scheduled_posts", "scheduled_posts show"],
  permission: "can_post",

  signature: {
    num: ct.number(),
  },

  async run({ message: msg, args, pluginData }) {
    const scheduledPosts = await pluginData.state.scheduledPosts.all();
    scheduledPosts.sort(sorter("post_at"));
    const post = scheduledPosts[args.num - 1];
    if (!post) {
      void pluginData.state.common.sendErrorMessage(msg, "Scheduled post not found");
      return;
    }

    postMessage(pluginData, msg.channel, post.content, post.attachments, post.enable_mentions);
  },
});
