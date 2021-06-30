import { Collection, Message, Snowflake } from "discord.js";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwner, sendErrorMessage } from "../../../pluginUtils";
import { confirm, noop, SECONDS } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { rehostAttachment } from "../rehostAttachment";
import { channelArchiverCmd } from "../types";

const MAX_ARCHIVED_MESSAGES = 5000;
const MAX_MESSAGES_PER_FETCH = 100;
const PROGRESS_UPDATE_INTERVAL = 5 * SECONDS;

export const ArchiveChannelCmd = channelArchiverCmd({
  trigger: "archive_channel",
  permission: null,

  config: {
    preFilters: [
      (command, context) => {
        return isOwner(context.pluginData, context.message.author.id);
      },
    ],
  },

  signature: {
    channel: ct.textChannel(),

    "attachment-channel": ct.textChannel({ option: true }),
    messages: ct.number({ option: true }),
  },

  async run({ message: msg, args, pluginData }) {
    if (!args["attachment-channel"]) {
      const confirmed = await confirm(msg.channel, msg.author.id, {
        content:
          "No `-attachment-channel` specified. Continue? Attachments will not be available in the log if their message is deleted.",
      });
      if (!confirmed) {
        sendErrorMessage(pluginData, msg.channel, "Canceled");
        return;
      }
    }

    const maxMessagesToArchive = args.messages ? Math.min(args.messages, MAX_ARCHIVED_MESSAGES) : MAX_ARCHIVED_MESSAGES;
    if (maxMessagesToArchive <= 0) return;

    const archiveLines: string[] = [];
    let archivedMessages = 0;
    let previousId: string | undefined;

    const startTime = Date.now();
    const progressMsg = await msg.channel.send("Creating archive...");
    const progressUpdateInterval = setInterval(() => {
      const secondsSinceStart = Math.round((Date.now() - startTime) / 1000);
      progressMsg
        .edit(`Creating archive...\n**Status:** ${archivedMessages} messages archived in ${secondsSinceStart} seconds`)
        .catch(() => clearInterval(progressUpdateInterval));
    }, PROGRESS_UPDATE_INTERVAL);

    while (archivedMessages < maxMessagesToArchive) {
      const messagesToFetch = Math.min(MAX_MESSAGES_PER_FETCH, maxMessagesToArchive - archivedMessages);
      const messages = (await args.channel.messages.fetch({
        limit: messagesToFetch,
        before: previousId as Snowflake,
      })) as Collection<Snowflake, Message>;
      if (messages.size === 0) break;

      for (const message of messages.values()) {
        const ts = moment.utc(message.createdTimestamp).format("YYYY-MM-DD HH:mm:ss");
        let content = `[${ts}] [${message.author.id}] [${message.author.username}#${
          message.author.discriminator
        }]: ${message.content || "<no text content>"}`;

        if (message.attachments.size) {
          if (args["attachment-channel"]) {
            const rehostedAttachmentUrl = await rehostAttachment(message.attachments[0], args["attachment-channel"]);
            content += `\n-- Attachment: ${rehostedAttachmentUrl}`;
          } else {
            content += `\n-- Attachment: ${message.attachments[0].url}`;
          }
        }

        if (message.reactions && Object.keys(message.reactions).length > 0) {
          const reactionCounts: string[] = [];
          for (const [emoji, info] of Object.entries(message.reactions)) {
            reactionCounts.push(`${info.count}x ${emoji}`);
          }
          content += `\n-- Reactions: ${reactionCounts.join(", ")}`;
        }

        archiveLines.push(content);
        previousId = message.id;
        archivedMessages++;
      }
    }

    clearInterval(progressUpdateInterval);

    archiveLines.reverse();

    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
    const nowTs = timeAndDate.inGuildTz().format(timeAndDate.getDateFormat("pretty_datetime"));

    let result = `Archived ${archiveLines.length} messages from #${args.channel.name} at ${nowTs}`;
    result += `\n\n${archiveLines.join("\n")}\n`;

    progressMsg.delete().catch(noop);
    msg.channel.send({
      content: "Archive created!",
      files: [
        {
          attachment: Buffer.from(result),
          name: `archive-${args.channel.name}-${moment.utc().format("YYYY-MM-DD-HH-mm-ss")}.txt`,
        },
      ],
    });
  },
});
