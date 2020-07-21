import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin";
import { RemindersPlugin } from "./Reminders/RemindersPlugin";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  AutoReactionsPlugin,
  LocateUserPlugin,
  RemindersPlugin,
  UsernameSaverPlugin,
  UtilityPlugin,
  WelcomeMessagePlugin,
];

export const globalPlugins = [];
