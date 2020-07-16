import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { RemindersPlugin } from "./Reminders/RemindersPlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  LocateUserPlugin,
  RemindersPlugin,
  UtilityPlugin,
];

export const globalPlugins = [];
