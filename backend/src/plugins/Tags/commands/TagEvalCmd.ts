import { MessageCreateOptions } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { logger } from "../../../logger.js";
import { resolveMessageMember } from "../../../pluginUtils.js";
import { TemplateParseError } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { tagsCmd } from "../types.js";
import { renderTagBody } from "../util/renderTagBody.js";

export const TagEvalCmd = tagsCmd({
  trigger: "tag eval",
  permission: "can_create",

  signature: {
    body: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const authorMember = await resolveMessageMember(msg);
    try {
      const rendered = (await renderTagBody(
        pluginData,
        args.body,
        [],
        {
          member: memberToTemplateSafeMember(authorMember),
          user: userToTemplateSafeUser(msg.author),
        },
        { member: msg.member },
      )) as MessageCreateOptions;

      if (!rendered.content && !rendered.embeds?.length) {
        void pluginData.state.common.sendErrorMessage(msg, "Evaluation resulted in an empty text");
        return;
      }

      msg.channel.send(rendered);
    } catch (e) {
      const errorMessage = e instanceof TemplateParseError ? e.message : "Internal error";

      void pluginData.state.common.sendErrorMessage(msg, `Failed to render tag: ${errorMessage}`);

      if (!(e instanceof TemplateParseError)) {
        logger.warn(`Internal error evaluating tag in ${pluginData.guild.id}: ${e}`);
      }

      return;
    }
  },
});
