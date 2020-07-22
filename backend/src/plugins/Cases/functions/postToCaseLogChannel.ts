import { PluginData } from "knub";
import { CasesPluginType } from "../types";
import { Message, MessageContent, MessageFile, TextChannel } from "eris";
import { isDiscordRESTError } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { Case } from "../../../data/entities/Case";
import { getCaseEmbed } from "./getCaseEmbed";
import { resolveCaseId } from "./resolveCaseId";
import { logger } from "../../../logger";

export async function postToCaseLogChannel(
  pluginData: PluginData<CasesPluginType>,
  content: MessageContent,
  file: MessageFile = null,
): Promise<Message> {
  const caseLogChannelId = pluginData.config.get().case_log_channel;
  if (!caseLogChannelId) return;

  const caseLogChannel = pluginData.guild.channels.get(caseLogChannelId);
  if (!caseLogChannel || !(caseLogChannel instanceof TextChannel)) return;

  let result;
  try {
    result = await caseLogChannel.createMessage(content, file);
  } catch (e) {
    if (isDiscordRESTError(e) && (e.code === 50013 || e.code === 50001)) {
      logger.warn(
        `Missing permissions to post mod cases in <#${caseLogChannel.id}> in guild ${pluginData.guild.name} (${pluginData.guild.id})`,
      );
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Missing permissions to post mod cases in <#${caseLogChannel.id}>`,
      });
      return;
    }

    throw e;
  }

  return result;
}

export async function postCaseToCaseLogChannel(
  pluginData: PluginData<CasesPluginType>,
  caseOrCaseId: Case | number,
): Promise<Message> {
  const theCase = await pluginData.state.cases.find(resolveCaseId(caseOrCaseId));
  if (!theCase) return;

  const caseEmbed = await getCaseEmbed(pluginData, caseOrCaseId);
  if (!caseEmbed) return;

  try {
    return postToCaseLogChannel(pluginData, caseEmbed);
  } catch (e) {
    pluginData.state.logs.log(LogType.BOT_ALERT, {
      body: `Failed to post case #${theCase.case_number} to the case log channel`,
    });
    return null;
  }
}
