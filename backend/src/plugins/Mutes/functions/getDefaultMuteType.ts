import { GuildPluginData } from "vety";
import { MuteTypes } from "../../../data/MuteTypes.js";
import { MutesPluginType } from "../types.js";

export function getDefaultMuteType(pluginData: GuildPluginData<MutesPluginType>): MuteTypes {
  const muteRole = pluginData.config.get().mute_role;
  return muteRole ? MuteTypes.Role : MuteTypes.Timeout;
}
