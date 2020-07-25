import { postCmd } from "../types";
import { sorter } from "src/utils";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";

export const ScheduledPostsDeleteCmd = postCmd({
  trigger: ["scheduled_posts delete", "scheduled_posts d"],
  permission: "can_post",

  signature: {
    num: ct.number(),
  },

  async run({ message: msg, args, pluginData }) {
    const scheduledPosts = await pluginData.state.scheduledPosts.all();
    scheduledPosts.sort(sorter("post_at"));
    const post = scheduledPosts[args.num - 1];
    if (!post) {
      return sendErrorMessage(pluginData, msg.channel, "Scheduled post not found");
    }

    await pluginData.state.scheduledPosts.delete(post.id);
    sendSuccessMessage(pluginData, msg.channel, "Scheduled post deleted!");
  },
});
