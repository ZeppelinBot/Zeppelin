import { GuildPluginData } from "knub";
import { SpamPluginType, RecentActionType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { logAndDetectMessageSpam } from "./logAndDetectMessageSpam";

export async function logCensor(pluginData: GuildPluginData<SpamPluginType>, savedMessage: SavedMessage) {
  const member = pluginData.guild.members.get(savedMessage.user_id);
  const config = pluginData.config.getMatchingConfig({
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
