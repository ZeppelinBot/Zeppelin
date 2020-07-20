import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { PersistPlugin } from "./Persist/PersistPlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  LocateUserPlugin,
  PersistPlugin,
  UtilityPlugin,
];

export const globalPlugins = [];
