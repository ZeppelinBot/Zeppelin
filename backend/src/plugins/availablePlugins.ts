import { ZeppelinGlobalPluginInfo, ZeppelinGuildPluginInfo } from "../types.js";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin.js";
import { autoDeletePluginDocs } from "./AutoDelete/docs.js";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin.js";
import { autoReactionsPluginDocs } from "./AutoReactions/docs.js";
import { AutomodPlugin } from "./Automod/AutomodPlugin.js";
import { automodPluginDocs } from "./Automod/docs.js";
import { BotControlPlugin } from "./BotControl/BotControlPlugin.js";
import { botControlPluginDocs } from "./BotControl/docs.js";
import { CasesPlugin } from "./Cases/CasesPlugin.js";
import { casesPluginDocs } from "./Cases/docs.js";
import { CensorPlugin } from "./Censor/CensorPlugin.js";
import { censorPluginDocs } from "./Censor/docs.js";
import { CommonPlugin } from "./Common/CommonPlugin.js";
import { commonPluginDocs } from "./Common/docs.js";
import { CompanionChannelsPlugin } from "./CompanionChannels/CompanionChannelsPlugin.js";
import { companionChannelsPluginDocs } from "./CompanionChannels/docs.js";
import { ContextMenuPlugin } from "./ContextMenus/ContextMenuPlugin.js";
import { contextMenuPluginDocs } from "./ContextMenus/docs.js";
import { CountersPlugin } from "./Counters/CountersPlugin.js";
import { countersPluginDocs } from "./Counters/docs.js";
import { CustomEventsPlugin } from "./CustomEvents/CustomEventsPlugin.js";
import { customEventsPluginDocs } from "./CustomEvents/docs.js";
import { GuildAccessMonitorPlugin } from "./GuildAccessMonitor/GuildAccessMonitorPlugin.js";
import { guildAccessMonitorPluginDocs } from "./GuildAccessMonitor/docs.js";
import { GuildConfigReloaderPlugin } from "./GuildConfigReloader/GuildConfigReloaderPlugin.js";
import { guildConfigReloaderPluginDocs } from "./GuildConfigReloader/docs.js";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin.js";
import { guildInfoSaverPluginDocs } from "./GuildInfoSaver/docs.js";
import { InternalPosterPlugin } from "./InternalPoster/InternalPosterPlugin.js";
import { internalPosterPluginDocs } from "./InternalPoster/docs.js";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin.js";
import { locateUserPluginDocs } from "./LocateUser/docs.js";
import { LogsPlugin } from "./Logs/LogsPlugin.js";
import { logsPluginDocs } from "./Logs/docs.js";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin.js";
import { messageSaverPluginDocs } from "./MessageSaver/docs.js";
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin.js";
import { modActionsPluginDocs } from "./ModActions/docs.js";
import { MutesPlugin } from "./Mutes/MutesPlugin.js";
import { mutesPluginDocs } from "./Mutes/docs.js";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin.js";
import { nameHistoryPluginDocs } from "./NameHistory/docs.js";
import { PersistPlugin } from "./Persist/PersistPlugin.js";
import { persistPluginDocs } from "./Persist/docs.js";
import { PhishermanPlugin } from "./Phisherman/PhishermanPlugin.js";
import { phishermanPluginDocs } from "./Phisherman/docs.js";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin.js";
import { pingableRolesPluginDocs } from "./PingableRoles/docs.js";
import { PostPlugin } from "./Post/PostPlugin.js";
import { postPluginDocs } from "./Post/docs.js";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin.js";
import { reactionRolesPluginDocs } from "./ReactionRoles/docs.js";
import { RemindersPlugin } from "./Reminders/RemindersPlugin.js";
import { remindersPluginDocs } from "./Reminders/docs.js";
import { RoleButtonsPlugin } from "./RoleButtons/RoleButtonsPlugin.js";
import { roleButtonsPluginDocs } from "./RoleButtons/docs.js";
import { RoleManagerPlugin } from "./RoleManager/RoleManagerPlugin.js";
import { roleManagerPluginDocs } from "./RoleManager/docs.js";
import { RolesPlugin } from "./Roles/RolesPlugin.js";
import { rolesPluginDocs } from "./Roles/docs.js";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRoles/SelfGrantableRolesPlugin.js";
import { selfGrantableRolesPluginDocs } from "./SelfGrantableRoles/docs.js";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin.js";
import { slowmodePluginDocs } from "./Slowmode/docs.js";
import { SpamPlugin } from "./Spam/SpamPlugin.js";
import { spamPluginDocs } from "./Spam/docs.js";
import { StarboardPlugin } from "./Starboard/StarboardPlugin.js";
import { starboardPluginDocs } from "./Starboard/docs.js";
import { TagsPlugin } from "./Tags/TagsPlugin.js";
import { tagsPluginDocs } from "./Tags/docs.js";
import { TimeAndDatePlugin } from "./TimeAndDate/TimeAndDatePlugin.js";
import { timeAndDatePluginDocs } from "./TimeAndDate/docs.js";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin.js";
import { usernameSaverPluginDocs } from "./UsernameSaver/docs.js";
import { UtilityPlugin } from "./Utility/UtilityPlugin.js";
import { utilityPluginDocs } from "./Utility/docs.js";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin.js";
import { welcomeMessagePluginDocs } from "./WelcomeMessage/docs.js";
import { CommandAliasesPlugin } from "./CommandAliases/CommandAliasesPlugin.js";
import { commandAliasesPluginDocs } from "./CommandAliases/docs.js";

export const availableGuildPlugins: ZeppelinGuildPluginInfo[] = [
  {
    plugin: AutoDeletePlugin,
    docs: autoDeletePluginDocs,
  },
  {
    plugin: AutomodPlugin,
    docs: automodPluginDocs,
  },
  {
    plugin: AutoReactionsPlugin,
    docs: autoReactionsPluginDocs,
  },
  {
    plugin: CasesPlugin,
    docs: casesPluginDocs,
    autoload: true,
  },
  {
    plugin: CensorPlugin,
    docs: censorPluginDocs,
  },
  {
    plugin: CommandAliasesPlugin,
    docs: commandAliasesPluginDocs,
  },
  {
    plugin: CompanionChannelsPlugin,
    docs: companionChannelsPluginDocs,
  },
  {
    plugin: ContextMenuPlugin,
    docs: contextMenuPluginDocs,
  },
  {
    plugin: CountersPlugin,
    docs: countersPluginDocs,
  },
  {
    plugin: CustomEventsPlugin,
    docs: customEventsPluginDocs,
  },
  {
    plugin: GuildInfoSaverPlugin,
    docs: guildInfoSaverPluginDocs,
    autoload: true,
  },
  // FIXME: New caching thing, or fix deadlocks with this plugin
  // {
  //   plugin: GuildMemberCachePlugin,
  //   docs: guildMemberCachePluginDocs,
  //   autoload: true,
  // },
  {
    plugin: InternalPosterPlugin,
    docs: internalPosterPluginDocs,
  },
  {
    plugin: LocateUserPlugin,
    docs: locateUserPluginDocs,
  },
  {
    plugin: LogsPlugin,
    docs: logsPluginDocs,
  },
  {
    plugin: MessageSaverPlugin,
    docs: messageSaverPluginDocs,
    autoload: true,
  },
  {
    plugin: ModActionsPlugin,
    docs: modActionsPluginDocs,
  },
  {
    plugin: MutesPlugin,
    docs: mutesPluginDocs,
    autoload: true,
  },
  {
    plugin: NameHistoryPlugin,
    docs: nameHistoryPluginDocs,
    autoload: true,
  },
  {
    plugin: PersistPlugin,
    docs: persistPluginDocs,
  },
  {
    plugin: PhishermanPlugin,
    docs: phishermanPluginDocs,
  },
  {
    plugin: PingableRolesPlugin,
    docs: pingableRolesPluginDocs,
  },
  {
    plugin: PostPlugin,
    docs: postPluginDocs,
  },
  {
    plugin: ReactionRolesPlugin,
    docs: reactionRolesPluginDocs,
  },
  {
    plugin: RemindersPlugin,
    docs: remindersPluginDocs,
  },
  {
    plugin: RoleButtonsPlugin,
    docs: roleButtonsPluginDocs,
  },
  {
    plugin: RoleManagerPlugin,
    docs: roleManagerPluginDocs,
  },
  {
    plugin: RolesPlugin,
    docs: rolesPluginDocs,
  },
  {
    plugin: SelfGrantableRolesPlugin,
    docs: selfGrantableRolesPluginDocs,
  },
  {
    plugin: SlowmodePlugin,
    docs: slowmodePluginDocs,
  },
  {
    plugin: SpamPlugin,
    docs: spamPluginDocs,
  },
  {
    plugin: StarboardPlugin,
    docs: starboardPluginDocs,
  },
  {
    plugin: TagsPlugin,
    docs: tagsPluginDocs,
  },
  {
    plugin: TimeAndDatePlugin,
    docs: timeAndDatePluginDocs,
    autoload: true,
  },
  {
    plugin: UsernameSaverPlugin,
    docs: usernameSaverPluginDocs,
  },
  {
    plugin: UtilityPlugin,
    docs: utilityPluginDocs,
  },
  {
    plugin: WelcomeMessagePlugin,
    docs: welcomeMessagePluginDocs,
  },
  {
    plugin: CommonPlugin,
    docs: commonPluginDocs,
    autoload: true,
  },
];

export const availableGlobalPlugins: ZeppelinGlobalPluginInfo[] = [
  {
    plugin: GuildConfigReloaderPlugin,
    docs: guildConfigReloaderPluginDocs,
  },
  {
    plugin: BotControlPlugin,
    docs: botControlPluginDocs,
  },
  {
    plugin: GuildAccessMonitorPlugin,
    docs: guildAccessMonitorPluginDocs,
  },
];
