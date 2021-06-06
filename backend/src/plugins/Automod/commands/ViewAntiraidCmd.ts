import { typedGuildCommand } from "knub";
import { AutomodPluginType } from "../types";

export const ViewAntiraidCmd = typedGuildCommand<AutomodPluginType>()({
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
