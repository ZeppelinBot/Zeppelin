import { tagsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { renderTag } from "../util/renderTag";
import { MessageContent } from "eris";
import { TemplateParseError } from "../../../templateFormatter";
import { sendErrorMessage } from "../../../pluginUtils";

export const TagEvalCmd = tagsCmd({
  trigger: "tag eval",
  permission: "can_create",

  signature: {
    body: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    try {
      const rendered = await renderTag(pluginData, args.body);
      msg.channel.createMessage(rendered);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        sendErrorMessage(pluginData, msg.channel, `Failed to render tag: ${e.message}`);
        return;
      }

      throw e;
    }
  },
});
