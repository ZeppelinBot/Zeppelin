import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { parseTemplate, TemplateParseError } from "../../../templateFormatter";
import { tagsCmd } from "../types";

export const TagCreateCmd = tagsCmd({
  trigger: "tag",
  permission: "can_create",

  signature: {
    tag: ct.string(),
    body: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
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

    const prefix = pluginData.config.get().prefix;
    sendSuccessMessage(pluginData, msg.channel, `Tag set! Use it with: \`${prefix}${args.tag}\``);
  },
});
