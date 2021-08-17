import { GuildMember } from "discord.js";
import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { parseArguments } from "knub-command-manager";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { TemplateParseError } from "../../../templateFormatter";
import { StrictMessageContent } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { Tag, TagsPluginType } from "../types";
import { renderTagBody } from "./renderTagBody";

export async function renderTagFromString(
  pluginData: GuildPluginData<TagsPluginType>,
  str: string,
  prefix: string,
  tagName: string,
  tagBody: t.TypeOf<typeof Tag>,
  member: GuildMember,
): Promise<StrictMessageContent | null> {
  const variableStr = str.slice(prefix.length + tagName.length).trim();
  const tagArgs = parseArguments(variableStr).map(v => v.value);

  // Format the string
  try {
    return renderTagBody(
      pluginData,
      tagBody,
      tagArgs,
      {
        member: memberToTemplateSafeMember(member),
        user: userToTemplateSafeUser(member.user),
      },
      { member },
    );
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
