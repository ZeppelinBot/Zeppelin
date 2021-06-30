import { FileOptions, Message, MessageOptions, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { Case } from "../../../data/entities/Case";
import { LogType } from "../../../data/LogType";
import { isDiscordAPIError } from "../../../utils";
import { CasesPluginType } from "../types";
import { getCaseEmbed } from "./getCaseEmbed";
import { resolveCaseId } from "./resolveCaseId";

export async function postToCaseLogChannel(
  pluginData: GuildPluginData<CasesPluginType>,
  content: MessageOptions,
  file?: FileOptions[],
): Promise<Message | null> {
  const caseLogChannelId = pluginData.config.get().case_log_channel;
  if (!caseLogChannelId) return null;

  const caseLogChannel = pluginData.guild.channels.cache.get(caseLogChannelId as Snowflake);
  if (!caseLogChannel || !(caseLogChannel instanceof TextChannel)) return null;

  let result;
  try {
    if (file != null) {
      content.files = file;
    }
    result = await caseLogChannel.send({ ...content });
  } catch (e) {
    if (isDiscordAPIError(e) && (e.code === 50013 || e.code === 50001)) {
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

  const caseEmbed = await getCaseEmbed(pluginData, caseOrCaseId, undefined, true);
  if (!caseEmbed) return null;

  if (theCase.log_message_id) {
    const [channelId, messageId] = theCase.log_message_id.split("-");

    try {
      const channel = pluginData.guild.channels.resolve(channelId as Snowflake) as TextChannel;
      await channel.messages.edit(messageId as Snowflake, caseEmbed);
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
