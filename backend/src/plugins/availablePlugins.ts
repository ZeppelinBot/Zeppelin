import { GlobalPluginBlueprint, GuildPluginBlueprint } from "knub";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin";
import { AutomodPlugin } from "./Automod/AutomodPlugin";
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
import { InternalPosterPlugin } from "./InternalPoster/InternalPosterPlugin";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { LogsPlugin } from "./Logs/LogsPlugin";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin";
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin";
import { MutesPlugin } from "./Mutes/MutesPlugin";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin";
import { PersistPlugin } from "./Persist/PersistPlugin";
import { PhishermanPlugin } from "./Phisherman/PhishermanPlugin";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin";
import { PostPlugin } from "./Post/PostPlugin";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin";
import { RemindersPlugin } from "./Reminders/RemindersPlugin";
import { RoleButtonsPlugin } from "./RoleButtons/RoleButtonsPlugin";
import { RoleManagerPlugin } from "./RoleManager/RoleManagerPlugin";
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

// prettier-ignore
export const guildPlugins: Array<GuildPluginBlueprint<any, any>> = [
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
  // GuildMemberCachePlugin, // FIXME: New caching thing, or fix deadlocks with this plugin
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
export const globalPlugins: Array<GlobalPluginBlueprint<any, any>> = [
  GuildConfigReloaderPlugin,
  BotControlPlugin,
  GuildAccessMonitorPlugin,
];

// prettier-ignore
export const baseGuildPlugins: Array<GuildPluginBlueprint<any, any>> = [
  GuildInfoSaverPlugin,
  MessageSaverPlugin,
  NameHistoryPlugin,
  // GuildMemberCachePlugin, // FIXME: New caching thing, or fix deadlocks with this plugin
  CasesPlugin,
  MutesPlugin,
  TimeAndDatePlugin,
  // TODO: Replace these with proper dependencies
];
