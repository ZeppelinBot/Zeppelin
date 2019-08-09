import { decorators as d, logger } from "knub";
import { GlobalZeppelinPlugin } from "./GlobalZeppelinPlugin";
import { Attachment, GuildChannel, Message, TextChannel } from "eris";
import { confirm, downloadFile, errorMessage, noop, SECONDS, trimLines } from "../utils";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import moment from "moment-timezone";
import https from "https";
import fs from "fs";
const fsp = fs.promises;

const MAX_ARCHIVED_MESSAGES = 5000;
const MAX_MESSAGES_PER_FETCH = 100;
const PROGRESS_UPDATE_INTERVAL = 5 * SECONDS;
const MAX_ATTACHMENT_REHOST_SIZE = 1024 * 1024 * 8;

export class ChannelArchiverPlugin extends ZeppelinPlugin {
  public static pluginName = "channel_archiver";

  protected isOwner(userId) {
    const owners = this.knub.getGlobalConfig().owners || [];
    return owners.includes(userId);
  }

  protected async rehostAttachment(attachment: Attachment, targetChannel: TextChannel): Promise<string> {
    if (attachment.size > MAX_ATTACHMENT_REHOST_SIZE) {
      return "Attachment too big to rehost";
    }

    let downloaded;
    try {
      downloaded = await downloadFile(attachment.url, 3);
    } catch (e) {
      return "Failed to download attachment after 3 tries";
    }

    try {
      const rehostMessage = await targetChannel.createMessage(`Rehost of attachment ${attachment.id}`, {
        name: attachment.filename,
        file: await fsp.readFile(downloaded.path),
      });
      return rehostMessage.attachments[0].url;
    } catch (e) {
      return "Failed to rehost attachment";
    }
  }

  @d.command("archive_channel", "<channel:textChannel>", {
    options: [
      {
        name: "attachment-channel",
        type: "textChannel",
      },
      {
        name: "messages",
        type: "number",
      },
    ],
    preFilters: [
      (msg, command, plugin: ChannelArchiverPlugin) => {
        return plugin.isOwner(msg.author.id);
      },
    ],
  })
  protected async archiveCmd(
    msg: Message,
    args: { channel: TextChannel; "attachment-channel"?: TextChannel; messages?: number },
  ) {
    if (!this.isOwner(msg.author.id)) return;

    if (!args["attachment-channel"]) {
      const confirmed = await confirm(
        this.bot,
        msg.channel,
        msg.author.id,
        "No `--attachment-channel` specified. Continue? Attachments will not be available in the log if their message is deleted.",
      );
      if (!confirmed) {
        msg.channel.createMessage(errorMessage("Canceled"));
        return;
      }
    }

    const maxMessagesToArchive = args.messages ? Math.min(args.messages, MAX_ARCHIVED_MESSAGES) : MAX_ARCHIVED_MESSAGES;
    if (maxMessagesToArchive <= 0) return;

    const archiveLines = [];
    let archivedMessages = 0;
    let previousId;

    const startTime = Date.now();
    const progressMsg = await msg.channel.createMessage("Creating archive...");
    const progressUpdateInterval = setInterval(() => {
      const secondsSinceStart = Math.round((Date.now() - startTime) / 1000);
      progressMsg
        .edit(`Creating archive...\n**Status:** ${archivedMessages} messages archived in ${secondsSinceStart} seconds`)
        .catch(() => clearInterval(progressUpdateInterval));
    }, PROGRESS_UPDATE_INTERVAL);

    while (archivedMessages < maxMessagesToArchive) {
      const messagesToFetch = Math.min(MAX_MESSAGES_PER_FETCH, maxMessagesToArchive - archivedMessages);
      const messages = await msg.channel.getMessages(messagesToFetch, previousId);

      for (const message of messages) {
        const ts = moment.utc(message.timestamp).format("YYYY-MM-DD HH:mm:ss");
        let content = `[${ts}] [${message.author.id}] [${message.author.username}#${
          message.author.discriminator
        }]: ${message.content || "<no text content>"}`;
        if (message.attachments.length) {
          if (args["attachment-channel"]) {
            const rehostedAttachmentUrl = await this.rehostAttachment(
              message.attachments[0],
              args["attachment-channel"],
            );
            content += `\n-- Attachment: ${rehostedAttachmentUrl}`;
          } else {
            content += `\n-- Attachment: ${message.attachments[0].url}`;
          }
        }

        archiveLines.push(content);
        previousId = message.id;
        archivedMessages++;
      }
    }

    clearInterval(progressUpdateInterval);

    archiveLines.reverse();

    const nowTs = moment().format("YYYY-MM-DD HH:mm:ss");

    let result = `Archived ${archiveLines.length} messages from #${args.channel.name} at ${nowTs}`;
    result += `\n\n${archiveLines.join("\n")}\n`;

    progressMsg.delete().catch(noop);
    msg.channel.createMessage("Archive created!", {
      file: Buffer.from(result),
      name: `archive-${args.channel.name}-${moment().format("YYYY-MM-DD-HH-mm-ss")}.txt`,
    });
  }
}
