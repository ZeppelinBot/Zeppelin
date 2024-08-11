import { GlobalPluginBlueprint, GuildPluginBlueprint } from "knub";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin.js";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin.js";
import { AutomodPlugin } from "./Automod/AutomodPlugin.js";
import { BotControlPlugin } from "./BotControl/BotControlPlugin.js";
import { CasesPlugin } from "./Cases/CasesPlugin.js";
import { CensorPlugin } from "./Censor/CensorPlugin.js";
import { ChannelArchiverPlugin } from "./ChannelArchiver/ChannelArchiverPlugin.js";
import { CommonPlugin } from "./Common/CommonPlugin.js";
import { CompanionChannelsPlugin } from "./CompanionChannels/CompanionChannelsPlugin.js";
import { ContextMenuPlugin } from "./ContextMenus/ContextMenuPlugin.js";
import { CountersPlugin } from "./Counters/CountersPlugin.js";
import { CustomEventsPlugin } from "./CustomEvents/CustomEventsPlugin.js";
import { GuildAccessMonitorPlugin } from "./GuildAccessMonitor/GuildAccessMonitorPlugin.js";
import { GuildConfigReloaderPlugin } from "./GuildConfigReloader/GuildConfigReloaderPlugin.js";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin.js";
import { InternalPosterPlugin } from "./InternalPoster/InternalPosterPlugin.js";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin.js";
import { LogsPlugin } from "./Logs/LogsPlugin.js";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin.js";
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "./Mutes/MutesPlugin.js";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin.js";
import { PersistPlugin } from "./Persist/PersistPlugin.js";
import { PhishermanPlugin } from "./Phisherman/PhishermanPlugin.js";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin.js";
import { PostPlugin } from "./Post/PostPlugin.js";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin.js";
import { RemindersPlugin } from "./Reminders/RemindersPlugin.js";
import { RoleButtonsPlugin } from "./RoleButtons/RoleButtonsPlugin.js";
import { RoleManagerPlugin } from "./RoleManager/RoleManagerPlugin.js";
import { RolesPlugin } from "./Roles/RolesPlugin.js";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRoles/SelfGrantableRolesPlugin.js";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin.js";
import { SpamPlugin } from "./Spam/SpamPlugin.js";
import { StarboardPlugin } from "./Starboard/StarboardPlugin.js";
import { TagsPlugin } from "./Tags/TagsPlugin.js";
import { TimeAndDatePlugin } from "./TimeAndDate/TimeAndDatePlugin.js";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin.js";
import { UtilityPlugin } from "./Utility/UtilityPlugin.js";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin.js";

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
  ModActionsPlugin,
  // GuildMemberCachePlugin, // FIXME: New caching thing, or fix deadlocks with this plugin
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
  CommonPlugin,
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
  CommonPlugin,
  // TODO: Replace these with proper dependencies
];
