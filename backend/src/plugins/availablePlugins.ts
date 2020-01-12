import { MessageSaverPlugin } from "./MessageSaver";
import { NameHistoryPlugin } from "./NameHistory";
import { CasesPlugin } from "./Cases";
import { MutesPlugin } from "./Mutes";
import { UtilityPlugin } from "./Utility";
import { ModActionsPlugin } from "./ModActions";
import { LogsPlugin } from "./Logs";
import { PostPlugin } from "./Post";
import { ReactionRolesPlugin } from "./ReactionRoles";
import { CensorPlugin } from "./Censor";
import { PersistPlugin } from "./Persist";
import { SpamPlugin } from "./Spam";
import { TagsPlugin } from "./Tags";
import { SlowmodePlugin } from "./Slowmode";
import { StarboardPlugin } from "./Starboard";
import { AutoReactionsPlugin } from "./AutoReactionsPlugin";
import { PingableRolesPlugin } from "./PingableRolesPlugin";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRolesPlugin";
import { RemindersPlugin } from "./Reminders";
import { WelcomeMessagePlugin } from "./WelcomeMessage";
import { BotControlPlugin } from "./BotControl";
import { UsernameSaver } from "./UsernameSaver";
import { CustomEventsPlugin } from "./CustomEvents";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver";
import { CompanionChannelPlugin } from "./CompanionChannels";
import { LocatePlugin } from "./LocateUser";
import { GuildConfigReloader } from "./GuildConfigReloader";
import { ChannelArchiverPlugin } from "./ChannelArchiver";
import { AutomodPlugin } from "./Automod";
import { RolesPlugin } from "./Roles";

/**
 * Plugins available to be loaded for individual guilds
 */
export const availablePlugins = [
  AutomodPlugin,
  MessageSaverPlugin,
  NameHistoryPlugin,
  CasesPlugin,
  MutesPlugin,
  UtilityPlugin,
  ModActionsPlugin,
  LogsPlugin,
  PostPlugin,
  ReactionRolesPlugin,
  CensorPlugin,
  PersistPlugin,
  SpamPlugin,
  TagsPlugin,
  SlowmodePlugin,
  StarboardPlugin,
  AutoReactionsPlugin,
  PingableRolesPlugin,
  SelfGrantableRolesPlugin,
  RemindersPlugin,
  WelcomeMessagePlugin,
  CustomEventsPlugin,
  GuildInfoSaverPlugin,
  CompanionChannelPlugin,
  LocatePlugin,
  ChannelArchiverPlugin,
  RolesPlugin,
];

/**
 * Plugins that are always loaded (subset of the names of the plugins in availablePlugins)
 */
export const basePlugins = [
  GuildInfoSaverPlugin.pluginName,
  MessageSaverPlugin.pluginName,
  NameHistoryPlugin.pluginName,
  CasesPlugin.pluginName,
  MutesPlugin.pluginName,
];

/**
 * Available global plugins (can't be loaded per-guild, only globally)
 */
export const availableGlobalPlugins = [BotControlPlugin, UsernameSaver, GuildConfigReloader];
