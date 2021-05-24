import { typedGuildCommand, GuildPluginData } from "knub";
import { AutomodPluginType } from "../types";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { sendSuccessMessage } from "../../../pluginUtils";

export const AntiraidClearCmd = typedGuildCommand<AutomodPluginType>()({
  trigger: ["antiraid clear", "antiraid reset", "antiraid none", "antiraid off"],
  permission: "can_set_antiraid",

  async run({ pluginData, message }) {
    await setAntiraidLevel(pluginData, null, message.author);
    sendSuccessMessage(pluginData, message.channel, "Anti-raid turned **off**");
  },
});
