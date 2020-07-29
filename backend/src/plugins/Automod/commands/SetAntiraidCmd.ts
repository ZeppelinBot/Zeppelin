import { command } from "knub";
import { AutomodPluginType } from "../types";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";

export const SetAntiraidCmd = command<AutomodPluginType>()({
  trigger: "antiraid",
  permission: "can_set_antiraid",

  signature: {
    level: ct.string(),
  },

  async run({ pluginData, message, args }) {
    const config = pluginData.config.get();
    if (!config.antiraid_levels.includes(args.level)) {
      sendErrorMessage(pluginData, message.channel, "Unknown anti-raid level");
      return;
    }

    await setAntiraidLevel(pluginData, args.level, message.author);
    sendSuccessMessage(pluginData, message.channel, `Anti-raid level set to **${args.level}**`);
  },
});
