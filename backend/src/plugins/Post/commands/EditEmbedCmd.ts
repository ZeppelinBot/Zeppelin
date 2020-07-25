import { postCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { Embed } from "eris";
import { trimLines } from "src/utils";
import { formatContent } from "../util/formatContent";

const COLOR_MATCH_REGEX = /^#?([0-9a-f]{6})$/;

export const EditEmbedCmd = postCmd({
  trigger: "edit_embed",
  permission: "can_post",

  signature: {
    messageId: ct.string(),
    maincontent: ct.string({ catchAll: true }),

    title: ct.string({ option: true }),
    content: ct.string({ option: true }),
    color: ct.string({ option: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const savedMessage = await pluginData.state.savedMessages.find(args.messageId);
    if (!savedMessage) {
      sendErrorMessage(pluginData, msg.channel, "Unknown message");
      return;
    }

    const content = args.content || args.maincontent;

    let color = null;
    if (args.color) {
      const colorMatch = args.color.match(COLOR_MATCH_REGEX);
      if (!colorMatch) {
        sendErrorMessage(pluginData, msg.channel, "Invalid color specified, use hex colors");
        return;
      }

      color = parseInt(colorMatch[1], 16);
    }

    const embed: Embed = savedMessage.data.embeds[0] as Embed;
    embed.type = "rich";
    if (args.title) embed.title = args.title;
    if (content) embed.description = formatContent(content);
    if (color) embed.color = color;

    await pluginData.client.editMessage(savedMessage.channel_id, savedMessage.id, { embed });
    await sendSuccessMessage(pluginData, msg.channel, "Embed edited");

    if (args.content) {
      const prefix = pluginData.guildConfig.prefix || "!";
      msg.channel.createMessage(
        trimLines(`
        <@!${msg.author.id}> You can now specify an embed's content directly at the end of the command:
        \`${prefix}edit_embed -title "Some title" content goes here\`
        The \`-content\` option will soon be removed in favor of this.
      `),
      );
    }
  },
});
