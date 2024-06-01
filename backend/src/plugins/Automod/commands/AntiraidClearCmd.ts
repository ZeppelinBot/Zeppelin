import { guildPluginMessageCommand } from "knub";
import { sendSuccessMessage } from "../../../pluginUtils.js";
import { setAntiraidLevel } from "../functions/setAntiraidLevel.js";
import { AutomodPluginType } from "../types.js";

export const AntiraidClearCmd = guildPluginMessageCommand<AutomodPluginType>()({
  trigger: ["antiraid clear", "antiraid reset", "antiraid none", "antiraid off"],
  permission: "can_set_antiraid",

  async run({ pluginData, message }) {
    await setAntiraidLevel(pluginData, null, message.author);
    sendSuccessMessage(pluginData, message.channel, "Anti-raid turned **off**");
  },
});
