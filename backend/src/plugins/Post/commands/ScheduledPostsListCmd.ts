import { escapeCodeBlock } from "discord.js";
import humanizeDuration from "humanize-duration";
import moment from "moment-timezone";
import { createChunkedMessage, DBDateFormat, deactivateMentions, sorter, trimLines } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { postCmd } from "../types";

const SCHEDULED_POST_PREVIEW_TEXT_LENGTH = 50;

export const ScheduledPostsListCmd = postCmd({
  trigger: ["scheduled_posts", "scheduled_posts list"],
  permission: "can_post",

  async run({ message: msg, pluginData }) {
    const scheduledPosts = await pluginData.state.scheduledPosts.all();
    if (scheduledPosts.length === 0) {
      msg.channel.send("No scheduled posts");
      return;
    }

    scheduledPosts.sort(sorter("post_at"));

    let i = 1;
    const postLines = scheduledPosts.map((p) => {
      let previewText = p.content.content || p.content.embeds?.[0]?.description || p.content.embeds?.[0]?.title || "";

      const isTruncated = previewText.length > SCHEDULED_POST_PREVIEW_TEXT_LENGTH;

      previewText = escapeCodeBlock(deactivateMentions(previewText))
        .replace(/\s+/g, " ")
        .slice(0, SCHEDULED_POST_PREVIEW_TEXT_LENGTH);

      const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
      const prettyPostAt = timeAndDate
        .inGuildTz(moment.utc(p.post_at!, DBDateFormat))
        .format(timeAndDate.getDateFormat("pretty_datetime"));
      const parts = [`\`#${i++}\` \`[${prettyPostAt}]\` ${previewText}${isTruncated ? "..." : ""}`];
      if (p.attachments.length) parts.push("*(with attachment)*");
      if (p.content.embeds?.length) parts.push("*(embed)*");
      if (p.repeat_until) {
        parts.push(`*(repeated every ${humanizeDuration(p.repeat_interval)} until ${p.repeat_until})*`);
      }
      if (p.repeat_times) {
        parts.push(
          `*(repeated every ${humanizeDuration(p.repeat_interval)}, ${p.repeat_times} more ${
            p.repeat_times === 1 ? "time" : "times"
          })*`,
        );
      }
      parts.push(`*(${p.author_name})*`);

      return parts.join(" ");
    });

    const finalMessage = trimLines(`
      ${postLines.join("\n")}

      Use \`scheduled_posts <num>\` to view a scheduled post in full
      Use \`scheduled_posts delete <num>\` to delete a scheduled post
    `);
    createChunkedMessage(msg.channel, finalMessage);
  },
});
