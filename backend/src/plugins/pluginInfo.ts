import { ZeppelinPluginInfo } from "../types";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin";
import { autoDeletePluginInfo } from "./AutoDelete/info";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin";
import { autoReactionsInfo } from "./AutoReactions/info";
import { AutomodPlugin } from "./Automod/AutomodPlugin";
import { automodPluginInfo } from "./Automod/info";
import { CasesPlugin } from "./Cases/CasesPlugin";
import { casesPluginInfo } from "./Cases/info";
import { CensorPlugin } from "./Censor/CensorPlugin";
import { censorPluginInfo } from "./Censor/info";
import { CompanionChannelsPlugin } from "./CompanionChannels/CompanionChannelsPlugin";
import { companionChannelsPluginInfo } from "./CompanionChannels/info";
import { ContextMenuPlugin } from "./ContextMenus/ContextMenuPlugin";
import { contextMenuPluginInfo } from "./ContextMenus/info";
import { CountersPlugin } from "./Counters/CountersPlugin";
import { countersPluginInfo } from "./Counters/info";
import { CustomEventsPlugin } from "./CustomEvents/CustomEventsPlugin";
import { customEventsPluginInfo } from "./CustomEvents/info";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin";
import { guildInfoSaverPluginInfo } from "./GuildInfoSaver/info";
import { InternalPosterPlugin } from "./InternalPoster/InternalPosterPlugin";
import { internalPosterPluginInfo } from "./InternalPoster/info";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin";
import { locateUserPluginInfo } from "./LocateUser/info";
import { LogsPlugin } from "./Logs/LogsPlugin";
import { logsPluginInfo } from "./Logs/info";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin";
import { messageSaverPluginInfo } from "./MessageSaver/info";
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin";
import { modActionsPluginInfo } from "./ModActions/info";
import { MutesPlugin } from "./Mutes/MutesPlugin";
import { mutesPluginInfo } from "./Mutes/info";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin";
import { nameHistoryPluginInfo } from "./NameHistory/info";
import { PersistPlugin } from "./Persist/PersistPlugin";
import { persistPluginInfo } from "./Persist/info";
import { PhishermanPlugin } from "./Phisherman/PhishermanPlugin";
import { phishermanPluginInfo } from "./Phisherman/info";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin";
import { pingableRolesPluginInfo } from "./PingableRoles/info";
import { PostPlugin } from "./Post/PostPlugin";
import { postPluginInfo } from "./Post/info";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin";
import { reactionRolesPluginInfo } from "./ReactionRoles/info";
import { RemindersPlugin } from "./Reminders/RemindersPlugin";
import { remindersPluginInfo } from "./Reminders/info";
import { RoleButtonsPlugin } from "./RoleButtons/RoleButtonsPlugin";
import { roleButtonsPluginInfo } from "./RoleButtons/info";
import { RoleManagerPlugin } from "./RoleManager/RoleManagerPlugin";
import { roleManagerPluginInfo } from "./RoleManager/info";
import { RolesPlugin } from "./Roles/RolesPlugin";
import { rolesPluginInfo } from "./Roles/info";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRoles/SelfGrantableRolesPlugin";
import { selfGrantableRolesPluginInfo } from "./SelfGrantableRoles/info";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin";
import { slowmodePluginInfo } from "./Slowmode/info";
import { SpamPlugin } from "./Spam/SpamPlugin";
import { spamPluginInfo } from "./Spam/info";
import { StarboardPlugin } from "./Starboard/StarboardPlugin";
import { starboardPluginInfo } from "./Starboard/info";
import { TagsPlugin } from "./Tags/TagsPlugin";
import { tagsPluginInfo } from "./Tags/info";
import { TimeAndDatePlugin } from "./TimeAndDate/TimeAndDatePlugin";
import { timeAndDatePluginInfo } from "./TimeAndDate/info";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin";
import { usernameSaverPluginInfo } from "./UsernameSaver/info";
import { UtilityPlugin } from "./Utility/UtilityPlugin";
import { utilityPluginInfo } from "./Utility/info";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin";
import { welcomeMessagePluginInfo } from "./WelcomeMessage/info";

export const guildPluginInfo: Record<string, ZeppelinPluginInfo> = {
  [AutoDeletePlugin.name]: autoDeletePluginInfo,
  [AutoReactionsPlugin.name]: autoReactionsInfo,
  [GuildInfoSaverPlugin.name]: guildInfoSaverPluginInfo,
  [CensorPlugin.name]: censorPluginInfo,
  [LocateUserPlugin.name]: locateUserPluginInfo,
  [LogsPlugin.name]: logsPluginInfo,
  [PersistPlugin.name]: persistPluginInfo,
  [PingableRolesPlugin.name]: pingableRolesPluginInfo,
  [PostPlugin.name]: postPluginInfo,
  [ReactionRolesPlugin.name]: reactionRolesPluginInfo,
  [MessageSaverPlugin.name]: messageSaverPluginInfo,
  [ModActionsPlugin.name]: modActionsPluginInfo,
  [NameHistoryPlugin.name]: nameHistoryPluginInfo,
  [RemindersPlugin.name]: remindersPluginInfo,
  [RolesPlugin.name]: rolesPluginInfo,
  [SelfGrantableRolesPlugin.name]: selfGrantableRolesPluginInfo,
  [SlowmodePlugin.name]: slowmodePluginInfo,
  [SpamPlugin.name]: spamPluginInfo,
  [StarboardPlugin.name]: starboardPluginInfo,
  [TagsPlugin.name]: tagsPluginInfo,
  [UsernameSaverPlugin.name]: usernameSaverPluginInfo,
  [UtilityPlugin.name]: utilityPluginInfo,
  [WelcomeMessagePlugin.name]: welcomeMessagePluginInfo,
  [CasesPlugin.name]: casesPluginInfo,
  [MutesPlugin.name]: mutesPluginInfo,
  [AutomodPlugin.name]: automodPluginInfo,
  [CompanionChannelsPlugin.name]: companionChannelsPluginInfo,
  [CustomEventsPlugin.name]: customEventsPluginInfo,
  [TimeAndDatePlugin.name]: timeAndDatePluginInfo,
  [CountersPlugin.name]: countersPluginInfo,
  [ContextMenuPlugin.name]: contextMenuPluginInfo,
  [PhishermanPlugin.name]: phishermanPluginInfo,
  [InternalPosterPlugin.name]: internalPosterPluginInfo,
  [RoleManagerPlugin.name]: roleManagerPluginInfo,
  [RoleButtonsPlugin.name]: roleButtonsPluginInfo,
};
