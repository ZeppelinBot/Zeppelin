import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  LocateUserPlugin,
  NameHistoryPlugin,
  UtilityPlugin,
];

export const globalPlugins = [];
