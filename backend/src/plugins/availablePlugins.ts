import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { ZeppelinGlobalPluginBlueprint, ZeppelinGuildPluginBlueprint } from "./ZeppelinPluginBlueprint";
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
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin";
import { PostPlugin } from "./Post/PostPlugin";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin";
import { CensorPlugin } from "./Censor/CensorPlugin";
import { RolesPlugin } from "./Roles/RolesPlugin";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin";
import { StarboardPlugin } from "./Starboard/StarboardPlugin";
import { ChannelArchiverPlugin } from "./ChannelArchiver/ChannelArchiverPlugin";
import { LogsPlugin } from "./Logs/LogsPlugin";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRoles/SelfGrantableRolesPlugin";
import { SpamPlugin } from "./Spam/SpamPlugin";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin";
import { AutomodPlugin } from "./Automod/AutomodPlugin";
import { CompanionChannelsPlugin } from "./CompanionChannels/CompanionChannelsPlugin";
import { CustomEventsPlugin } from "./CustomEvents/CustomEventsPlugin";
import { BotControlPlugin } from "./BotControl/BotControlPlugin";
import { GuildAccessMonitorPlugin } from "./GuildAccessMonitor/GuildAccessMonitorPlugin";
import { TimeAndDatePlugin } from "./TimeAndDate/TimeAndDatePlugin";
import { CountersPlugin } from "./Counters/CountersPlugin";
import { AFKPlugin } from './AFK/AFKPlugin';

// prettier-ignore
export const guildPlugins: Array<ZeppelinGuildPluginBlueprint<any>> = [
  AutoDeletePlugin,
  AutoReactionsPlugin,
  GuildInfoSaverPlugin,
  CensorPlugin,
  ChannelArchiverPlugin,
  LocateUserPlugin,
  LogsPlugin,
  PersistPlugin,
  PingableRolesPlugin,
  PostPlugin,
  ReactionRolesPlugin,
  MessageSaverPlugin,
  ModActionsPlugin,
  NameHistoryPlugin,
  RemindersPlugin,
  RolesPlugin,
  SelfGrantableRolesPlugin,
  SlowmodePlugin,
  SpamPlugin,
  StarboardPlugin,
  TagsPlugin,
  UsernameSaverPlugin,
  UtilityPlugin,
  WelcomeMessagePlugin,
  CasesPlugin,
  MutesPlugin,
  AutomodPlugin,
  CompanionChannelsPlugin,
  CustomEventsPlugin,
  TimeAndDatePlugin,
  CountersPlugin,
  AFKPlugin,
];

// prettier-ignore
export const globalPlugins: Array<ZeppelinGlobalPluginBlueprint<any>> = [
  GuildConfigReloaderPlugin,
  BotControlPlugin,
  GuildAccessMonitorPlugin,
];

// prettier-ignore
export const baseGuildPlugins: Array<ZeppelinGuildPluginBlueprint<any>> = [
  GuildInfoSaverPlugin,
  MessageSaverPlugin,
  NameHistoryPlugin,
  CasesPlugin,
  MutesPlugin,
  TimeAndDatePlugin,
  // TODO: Replace these with proper dependencies
];
