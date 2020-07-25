import { postCmd } from "../types";
import { sorter } from "src/utils";
import { sendErrorMessage } from "src/pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { postMessage } from "../util/postMessage";
import { TextChannel } from "eris";

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
      return sendErrorMessage(pluginData, msg.channel, "Scheduled post not found");
    }

    postMessage(pluginData, msg.channel as TextChannel, post.content, post.attachments, post.enable_mentions);
  },
});
