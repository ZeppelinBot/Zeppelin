import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { parseArguments } from "knub-command-manager";
import { TemplateParseError } from "../../../templateFormatter";
import { StrictMessageContent, validateAndParseMessageContent } from "../../../utils";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { TagsPluginType, TTag } from "../types";
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
    if (e instanceof TemplateParseError) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Failed to render tag \`${prefix}${tagName}\`: ${e.message}`,
      });
      return null;
    }

    throw e;
  }
}
