import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { TemplateParseError } from "../../../templateFormatter";
import { stripObjectToScalars } from "../../../utils";
import { tagsCmd } from "../types";
import { renderTagBody } from "../util/renderTagBody";

export const TagEvalCmd = tagsCmd({
  trigger: "tag eval",
  permission: "can_create",

  signature: {
    body: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    try {
      const rendered = await renderTagBody(
        pluginData,
        args.body,
        [],
        {
          member: stripObjectToScalars(msg.member, ["user"]),
          user: stripObjectToScalars(msg.member.user),
        },
        { member: msg.member },
      );

      if (!rendered.content && !rendered.embed) {
        sendErrorMessage(pluginData, msg.channel, "Evaluation resulted in an empty text");
        return;
      }

      msg.channel.send(rendered);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        sendErrorMessage(pluginData, msg.channel, `Failed to render tag: ${e.message}`);
        return;
      }

      throw e;
    }
  },
});
