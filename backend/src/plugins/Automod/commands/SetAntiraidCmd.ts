import { guildPluginMessageCommand } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { AutomodPluginType } from "../types";

export const SetAntiraidCmd = guildPluginMessageCommand<AutomodPluginType>()({
  trigger: "antiraid",
  permission: "can_set_antiraid",

  signature: {
    level: ct.string(),
  },

  async run({ pluginData, message, args }) {
    const config = pluginData.config.get();
    if (!config.antiraid_levels.includes(args.level)) {
      pluginData.state.common.sendErrorMessage(message, "Unknown anti-raid level");
      return;
    }

    await setAntiraidLevel(pluginData, args.level, message.author);
    pluginData.state.common.sendSuccessMessage(message, `Anti-raid level set to **${args.level}**`);
  },
});
