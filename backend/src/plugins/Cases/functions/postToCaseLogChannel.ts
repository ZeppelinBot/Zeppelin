import { FileOptions, MessageOptions, NewsChannel, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { Case } from "../../../data/entities/Case";
import { isDiscordAPIError } from "../../../utils";
import { CasesPluginType } from "../types";
import { getCaseEmbed } from "./getCaseEmbed";
import { resolveCaseId } from "./resolveCaseId";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { InternalPosterPlugin } from "../../InternalPoster/InternalPosterPlugin";
import { InternalPosterMessageResult } from "../../InternalPoster/functions/sendMessage";

export async function postToCaseLogChannel(
  pluginData: GuildPluginData<CasesPluginType>,
  content: MessageOptions,
  file?: FileOptions[],
): Promise<InternalPosterMessageResult | null> {
  const caseLogChannelId = pluginData.config.get().case_log_channel;
  if (!caseLogChannelId) return null;

  const caseLogChannel = pluginData.guild.channels.cache.get(caseLogChannelId as Snowflake);
  // This doesn't use `!isText() || isThread()` because TypeScript had some issues inferring types from it
  if (!caseLogChannel || !(caseLogChannel instanceof TextChannel || caseLogChannel instanceof NewsChannel)) return null;

  let result: InternalPosterMessageResult | null = null;
  try {
    if (file != null) {
      content.files = file;
    }
    const poster = pluginData.getPlugin(InternalPosterPlugin);
    result = await poster.sendMessage(caseLogChannel, { ...content });
  } catch (e) {
    if (isDiscordAPIError(e) && (e.code === 50013 || e.code === 50001)) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
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
): Promise<void> {
  const theCase = await pluginData.state.cases.find(resolveCaseId(caseOrCaseId));
  if (!theCase) return;

  const caseEmbed = await getCaseEmbed(pluginData, caseOrCaseId, undefined, true);
  if (!caseEmbed) return;

  if (theCase.log_message_id) {
    const [channelId, messageId] = theCase.log_message_id.split("-");

    try {
      const poster = pluginData.getPlugin(InternalPosterPlugin);
      const channel = pluginData.guild.channels.resolve(channelId as Snowflake) as TextChannel;
      const message = await channel.messages.fetch(messageId);
      if (message) {
        await poster.editMessage(message, caseEmbed);
      }
      return;
    } catch {} // tslint:disable-line:no-empty
  }

  try {
    const postedMessage = await postToCaseLogChannel(pluginData, caseEmbed);
    if (postedMessage) {
      await pluginData.state.cases.update(theCase.id, {
        log_message_id: `${postedMessage.channelId}-${postedMessage.id}`,
      });
    }
  } catch {
    pluginData.getPlugin(LogsPlugin).logBotAlert({
      body: `Failed to post case #${theCase.case_number} to the case log channel`,
    });
    return;
  }
}
