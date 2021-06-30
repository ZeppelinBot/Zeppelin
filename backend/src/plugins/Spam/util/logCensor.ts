import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { RecentActionType, SpamPluginType } from "../types";
import { logAndDetectMessageSpam } from "./logAndDetectMessageSpam";

export async function logCensor(pluginData: GuildPluginData<SpamPluginType>, savedMessage: SavedMessage) {
  const member = pluginData.guild.members.cache.get(savedMessage.user_id as Snowflake);
  const config = await pluginData.config.getMatchingConfig({
    userId: savedMessage.user_id,
    channelId: savedMessage.channel_id,
    member,
  });
  const spamConfig = config.max_censor;

  if (spamConfig) {
    logAndDetectMessageSpam(
      pluginData,
      savedMessage,
      RecentActionType.Censor,
      spamConfig,
      1,
      "too many censored messages",
    );
  }
}
