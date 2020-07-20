import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  LocateUserPlugin,
  MessageSaverPlugin,
  UtilityPlugin,
];

export const globalPlugins = [];
