import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { parseTemplate, TemplateParseError } from "../../../templateFormatter";
import { tagsCmd } from "../types";

export const TagCreateCmd = tagsCmd({
  trigger: "tag",
  permission: "can_create",

  signature: {
    alias: ct.bool({ option: true, shortcut: "a", isSwitch: true }),
    tag: ct.string(),
    body: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const prefix = pluginData.config.get().prefix;

    if (args.alias) {
      const existingTag = await pluginData.state.tagAliases.find(args.body);
      if (existingTag) {
        sendErrorMessage(pluginData, msg.channel, `You cannot create an alias of an alias`);
        return;
      }
      await pluginData.state.tagAliases.createOrUpdate(args.tag, args.body, msg.author.id);
      sendSuccessMessage(pluginData, msg.channel, `Alias set! Use it with: \`${prefix}${args.tag}\``);
      return;
    }
    try {
      parseTemplate(args.body);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        sendErrorMessage(pluginData, msg.channel, `Invalid tag syntax: ${e.message}`);
        return;
      } else {
        throw e;
      }
    }

    await pluginData.state.tags.createOrUpdate(args.tag, args.body, msg.author.id);

    sendSuccessMessage(pluginData, msg.channel, `Tag set! Use it with: \`${prefix}${args.tag}\``);
  },
});
