import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  LocateUserPlugin,
  UsernameSaverPlugin,
  UtilityPlugin,
];

export const globalPlugins = [];
