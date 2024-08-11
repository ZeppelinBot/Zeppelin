import { APIEmbed } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isValidEmbed, trimLines } from "../../../utils.js";
import { parseColor } from "../../../utils/parseColor.js";
import { rgbToInt } from "../../../utils/rgbToInt.js";
import { postCmd } from "../types.js";
import { formatContent } from "../util/formatContent.js";

export const EditEmbedCmd = postCmd({
  trigger: "edit_embed",
  permission: "can_post",

  signature: {
    message: ct.messageTarget(),
    maincontent: ct.string({ catchAll: true }),

    title: ct.string({ option: true }),
    content: ct.string({ option: true }),
    color: ct.string({ option: true }),
    raw: ct.bool({ option: true, isSwitch: true, shortcut: "r" }),
  },

  async run({ message: msg, args, pluginData }) {
    const content = args.content || args.maincontent;

    let color: number | null = null;
    if (args.color) {
      const colorRgb = parseColor(args.color);
      if (colorRgb) {
        color = rgbToInt(colorRgb);
      } else {
        void pluginData.state.common.sendErrorMessage(msg, "Invalid color specified");
        return;
      }
    }

    const targetMessage = await args.message.channel.messages.fetch(args.message.messageId);
    if (!targetMessage) {
      void pluginData.state.common.sendErrorMessage(msg, "Unknown message");
      return;
    }

    let embed: APIEmbed = targetMessage.embeds![0]?.toJSON() ?? { fields: [] };
    if (args.title) embed.title = args.title;
    if (color) embed.color = color;

    if (content) {
      if (args.raw) {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          void pluginData.state.common.sendErrorMessage(msg, `Syntax error in embed JSON: ${e.message}`);
          return;
        }

        if (!isValidEmbed(parsed)) {
          void pluginData.state.common.sendErrorMessage(msg, "Embed is not valid");
          return;
        }

        embed = Object.assign({}, embed, parsed);
      } else {
        embed.description = formatContent(content);
      }
    }

    args.message.channel.messages.edit(targetMessage.id, {
      embeds: [embed],
    });
    await pluginData.state.common.sendSuccessMessage(msg, "Embed edited");

    if (args.content) {
      const prefix = pluginData.fullConfig.prefix || "!";
      msg.channel.send(
        trimLines(`
        <@!${msg.author.id}> You can now specify an embed's content directly at the end of the command:
        \`${prefix}edit_embed -title "Some title" content goes here\`
        The \`-content\` option will soon be removed in favor of this.
      `),
      );
    }
  },
});
