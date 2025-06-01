import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { TemplateParseError, parseTemplate } from "../../../templateFormatter.js";
import { tagsCmd } from "../types.js";

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
        void pluginData.state.common.sendErrorMessage(msg, `Invalid tag syntax: ${e.message}`);
        return;
      } else {
        throw e;
      }
    }

    await pluginData.state.tags.createOrUpdate(args.tag, args.body, msg.author.id);

    const prefix = pluginData.config.get().prefix;
    void pluginData.state.common.sendSuccessMessage(msg, `Tag set! Use it with: \`${prefix}${args.tag}\``);
  },
});
