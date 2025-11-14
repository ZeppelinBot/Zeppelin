import { guildPluginMessageCommand } from "vety";
import { AutomodPluginType } from "../types.js";

export const ViewAntiraidCmd = guildPluginMessageCommand<AutomodPluginType>()({
  trigger: "antiraid",
  permission: "can_view_antiraid",

  async run({ pluginData, message }) {
    if (pluginData.state.cachedAntiraidLevel) {
      message.channel.send(`Anti-raid is set to **${pluginData.state.cachedAntiraidLevel}**`);
    } else {
      message.channel.send(`Anti-raid is **off**`);
    }
  },
});
