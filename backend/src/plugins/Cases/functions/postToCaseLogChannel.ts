import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";
import { Message, MessageContent, MessageFile, TextChannel } from "eris";
import { isDiscordRESTError } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { Case } from "../../../data/entities/Case";
import { getCaseEmbed } from "./getCaseEmbed";
import { resolveCaseId } from "./resolveCaseId";
import { logger } from "../../../logger";

export async function postToCaseLogChannel(
  pluginData: GuildPluginData<CasesPluginType>,
  content: MessageContent,
  file?: MessageFile,
): Promise<Message | null> {
  const caseLogChannelId = pluginData.config.get().case_log_channel;
  if (!caseLogChannelId) return null;

  const caseLogChannel = pluginData.guild.channels.get(caseLogChannelId);
  if (!caseLogChannel || !(caseLogChannel instanceof TextChannel)) return null;

  let result;
  try {
    result = await caseLogChannel.createMessage(content, file);
  } catch (e) {
    if (isDiscordRESTError(e) && (e.code === 50013 || e.code === 50001)) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Missing permissions to post mod cases in <#${caseLogChannel.id}>`,
      });
      return null;
    }

    throw e;
  }

  return result;
}

export async function postCaseToCaseLogChannel(
  pluginData: GuildPluginData<CasesPluginType>,
  caseOrCaseId: Case | number,
): Promise<Message | null> {
  const theCase = await pluginData.state.cases.find(resolveCaseId(caseOrCaseId));
  if (!theCase) return null;

  const caseEmbed = await getCaseEmbed(pluginData, caseOrCaseId);
  if (!caseEmbed) return null;

  if (theCase.log_message_id) {
    const [channelId, messageId] = theCase.log_message_id.split("-");

    try {
      await pluginData.client.editMessage(channelId, messageId, caseEmbed);
      return null;
    } catch {} // tslint:disable-line:no-empty
  }

  try {
    const postedMessage = await postToCaseLogChannel(pluginData, caseEmbed);
    if (postedMessage) {
      await pluginData.state.cases.update(theCase.id, {
        log_message_id: `${postedMessage.channel.id}-${postedMessage.id}`,
      });
    }
    return postedMessage;
  } catch {
    pluginData.state.logs.log(LogType.BOT_ALERT, {
      body: `Failed to post case #${theCase.case_number} to the case log channel`,
    });
    return null;
  }
}
