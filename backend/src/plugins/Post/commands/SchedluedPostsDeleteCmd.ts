import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { sorter } from "../../../utils";
import { postCmd } from "../types";

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
      sendErrorMessage(pluginData, msg.channel, "Scheduled post not found");
      return;
    }

    await pluginData.state.scheduledPosts.delete(post.id);
    sendSuccessMessage(pluginData, msg.channel, "Scheduled post deleted!");
  },
});
