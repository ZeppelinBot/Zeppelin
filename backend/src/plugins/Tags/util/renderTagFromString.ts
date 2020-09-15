import { Tag, TagsPluginType } from "../types";
import { Member } from "eris";
import * as t from "io-ts";
import { renderRecursively, StrictMessageContent, stripObjectToScalars } from "src/utils";
import { parseArguments } from "knub-command-manager";
import { TemplateParseError } from "src/templateFormatter";
import { PluginData } from "knub";
import { logger } from "src/logger";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import { renderTagBody } from "./renderTagBody";

export async function renderTagFromString(
  pluginData: PluginData<TagsPluginType>,
  str: string,
  prefix: string,
  tagName: string,
  tagBody: t.TypeOf<typeof Tag>,
  member: Member,
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
        member: stripObjectToScalars(member, ["user"]),
        user: stripObjectToScalars(member.user),
      },
      { member },
    );
  } catch (e) {
    if (e instanceof TemplateParseError) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Failed to render tag \`${prefix}${tagName}\`: ${e.message}`,
      });
      return null;
    }

    throw e;
  }
}
