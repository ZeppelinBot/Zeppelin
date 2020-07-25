import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { PersistPlugin } from "./Persist/PersistPlugin";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin";
import { RemindersPlugin } from "./Reminders/RemindersPlugin";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin";
import { GuildConfigReloaderPlugin } from "./GuildConfigReloader/GuildConfigReloaderPlugin";
import { CasesPlugin } from "./Cases/CasesPlugin";
import { MutesPlugin } from "./Mutes/MutesPlugin";
import { TagsPlugin } from "./Tags/TagsPlugin";
import { PostPlugin } from "./Post/PostPlugin";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin";
import { CensorPlugin } from "./Censor/CensorPlugin";
import { RolesPlugin } from "./Roles/RolesPlugin";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin";
import { StarboardPlugin } from "./Starboard/StarboardPlugin";
import { ChannelArchiverPlugin } from "./ChannelArchiver/ChannelArchiverPlugin";

// prettier-ignore
export const guildPlugins: Array<ZeppelinPluginBlueprint<any>> = [
  AutoDeletePlugin,
  AutoReactionsPlugin,
  GuildInfoSaverPlugin,
  CensorPlugin,
  ChannelArchiverPlugin,
  LocateUserPlugin,
  PersistPlugin,
  PingableRolesPlugin,
  PostPlugin,
  MessageSaverPlugin,
  NameHistoryPlugin,
  RemindersPlugin,
  RolesPlugin,
  SlowmodePlugin,
  StarboardPlugin,
  TagsPlugin,
  UsernameSaverPlugin,
  UtilityPlugin,
  WelcomeMessagePlugin,
  CasesPlugin,
  MutesPlugin,
];

// prettier-ignore
export const globalPlugins = [
  GuildConfigReloaderPlugin,
];
