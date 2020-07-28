import { PluginData } from "knub";
import { SpamPluginType, RecentActionType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { logAndDetectMessageSpam } from "./logAndDetectMessageSpam";

export async function logCensor(pluginData: PluginData<SpamPluginType>, savedMessage: SavedMessage) {
  const config = pluginData.config.getMatchingConfig({
    userId: savedMessage.user_id,
    channelId: savedMessage.channel_id,
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
