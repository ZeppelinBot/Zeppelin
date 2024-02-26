import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sorter } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { postCmd } from "../types";
import { postMessage } from "../util/postMessage";

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
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Scheduled post not found");
      return;
    }

    postMessage(pluginData, msg.channel, post.content, post.attachments, post.enable_mentions);
  },
});
