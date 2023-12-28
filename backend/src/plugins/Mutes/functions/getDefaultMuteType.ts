import { GuildPluginData } from "knub";
import { MuteTypes } from "../../../data/MuteTypes";
import { MutesPluginType } from "../types";

export function getDefaultMuteType(pluginData: GuildPluginData<MutesPluginType>): MuteTypes {
  const muteRole = pluginData.config.get().mute_role;
  return muteRole ? MuteTypes.Role : MuteTypes.Timeout;
}
