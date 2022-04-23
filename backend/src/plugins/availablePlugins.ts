import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin";
import { AutomodPlugin } from "./Automod/AutomodPlugin";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin";
import { BotControlPlugin } from "./BotControl/BotControlPlugin";
import { CasesPlugin } from "./Cases/CasesPlugin";
import { CensorPlugin } from "./Censor/CensorPlugin";
import { ChannelArchiverPlugin } from "./ChannelArchiver/ChannelArchiverPlugin";
import { CompanionChannelsPlugin } from "./CompanionChannels/CompanionChannelsPlugin";
import { ContextMenuPlugin } from "./ContextMenus/ContextMenuPlugin";
import { CountersPlugin } from "./Counters/CountersPlugin";
import { CustomEventsPlugin } from "./CustomEvents/CustomEventsPlugin";
import { GuildAccessMonitorPlugin } from "./GuildAccessMonitor/GuildAccessMonitorPlugin";
import { GuildConfigReloaderPlugin } from "./GuildConfigReloader/GuildConfigReloaderPlugin";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { LogsPlugin } from "./Logs/LogsPlugin";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin";
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin";
import { MutesPlugin } from "./Mutes/MutesPlugin";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin";
import { PersistPlugin } from "./Persist/PersistPlugin";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin";
import { PostPlugin } from "./Post/PostPlugin";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin";
import { RemindersPlugin } from "./Reminders/RemindersPlugin";
import { RolesPlugin } from "./Roles/RolesPlugin";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRoles/SelfGrantableRolesPlugin";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin";
import { SpamPlugin } from "./Spam/SpamPlugin";
import { StarboardPlugin } from "./Starboard/StarboardPlugin";
import { TagsPlugin } from "./Tags/TagsPlugin";
import { TimeAndDatePlugin } from "./TimeAndDate/TimeAndDatePlugin";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin";
import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin";
import { ZeppelinGlobalPluginBlueprint, ZeppelinGuildPluginBlueprint } from "./ZeppelinPluginBlueprint";
import { PhishermanPlugin } from "./Phisherman/PhishermanPlugin";
import { InternalPosterPlugin } from "./InternalPoster/InternalPosterPlugin";
import { RoleManagerPlugin } from "./RoleManager/RoleManagerPlugin";
import { RoleButtonsPlugin } from "./RoleButtons/RoleButtonsPlugin";

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
  ContextMenuPlugin,
  PhishermanPlugin,
  InternalPosterPlugin,
  RoleManagerPlugin,
  RoleButtonsPlugin,
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
