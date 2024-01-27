import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { parseArguments } from "knub-command-manager";
import { logger } from "../../../logger";
import { TemplateParseError } from "../../../templateFormatter";
import { StrictMessageContent, validateAndParseMessageContent } from "../../../utils";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { TTag, TagsPluginType } from "../types";
import { renderTagBody } from "./renderTagBody";

export async function renderTagFromString(
  pluginData: GuildPluginData<TagsPluginType>,
  str: string,
  prefix: string,
  tagName: string,
  tagBody: TTag,
  member: GuildMember,
): Promise<StrictMessageContent | null> {
  const variableStr = str.slice(prefix.length + tagName.length).trim();
  const tagArgs = parseArguments(variableStr).map((v) => v.value);

  // Format the string
  try {
    const rendered = await renderTagBody(
      pluginData,
      tagBody,
      tagArgs,
      {
        member: memberToTemplateSafeMember(member),
        user: userToTemplateSafeUser(member.user),
      },
      { member },
    );

    return validateAndParseMessageContent(rendered);
  } catch (e) {
    const logs = pluginData.getPlugin(LogsPlugin);
    const errorMessage = e instanceof TemplateParseError ? e.message : "Internal error";
    logs.logBotAlert({
      body: `Failed to render tag \`${prefix}${tagName}\`: ${errorMessage}`,
    });

    if (!(e instanceof TemplateParseError)) {
      logger.warn(`Internal error rendering tag ${tagName} in ${pluginData.guild.id}: ${e}`);
    }

    return null;
  }
}
