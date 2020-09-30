import { guildCommand, GuildPluginData } from "knub";
import { AutomodPluginType } from "../types";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";

export const ViewAntiraidCmd = guildCommand<AutomodPluginType>()({
  trigger: "antiraid",
  permission: "can_view_antiraid",

  async run({ pluginData, message }) {
    if (pluginData.state.cachedAntiraidLevel) {
      message.channel.createMessage(`Anti-raid is set to **${pluginData.state.cachedAntiraidLevel}**`);
    } else {
      message.channel.createMessage(`Anti-raid is **off**`);
    }
  },
});
