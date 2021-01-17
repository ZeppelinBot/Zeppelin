import { postCmd } from "../types";
import { sorter } from "../../../utils";
import { sendErrorMessage } from "../../../pluginUtils";
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
      sendErrorMessage(pluginData, msg.channel, "Scheduled post not found");
      return;
    }

    postMessage(pluginData, msg.channel as TextChannel, post.content, post.attachments, post.enable_mentions);
  },
});
