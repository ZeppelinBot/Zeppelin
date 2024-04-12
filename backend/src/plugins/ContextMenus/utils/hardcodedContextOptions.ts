import { cleanAction } from "../actions/clean";
import { muteAction } from "../actions/mute";
import { userInfoAction } from "../actions/userInfo";

export const hardcodedContext: Record<string, string> = {
  user_muteindef: "Mute Indefinitely",
  user_mute1d: "Mute for 1 day",
  user_mute1h: "Mute for 1 hour",
  user_info: "Get Info",
  message_clean10: "Clean 10 messages",
  message_clean25: "Clean 25 messages",
  message_clean50: "Clean 50 messages",
};

export const hardcodedActions = {
  user_muteindef: (pluginData, interaction) => muteAction(pluginData, undefined, interaction),
  user_mute1d: (pluginData, interaction) => muteAction(pluginData, "1d", interaction),
  user_mute1h: (pluginData, interaction) => muteAction(pluginData, "1h", interaction),
  user_info: (pluginData, interaction) => userInfoAction(pluginData, interaction),
  message_clean10: (pluginData, interaction) => cleanAction(pluginData, 10, interaction),
  message_clean25: (pluginData, interaction) => cleanAction(pluginData, 25, interaction),
  message_clean50: (pluginData, interaction) => cleanAction(pluginData, 50, interaction),
};
