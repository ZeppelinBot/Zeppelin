import { ZeppelinPluginInfo } from "../types.js";
import { AutoDeletePlugin } from "./AutoDelete/AutoDeletePlugin.js";
import { autoDeletePluginInfo } from "./AutoDelete/info.js";
import { AutoReactionsPlugin } from "./AutoReactions/AutoReactionsPlugin.js";
import { autoReactionsInfo } from "./AutoReactions/info.js";
import { AutomodPlugin } from "./Automod/AutomodPlugin.js";
import { automodPluginInfo } from "./Automod/info.js";
import { CasesPlugin } from "./Cases/CasesPlugin.js";
import { casesPluginInfo } from "./Cases/info.js";
import { CensorPlugin } from "./Censor/CensorPlugin.js";
import { censorPluginInfo } from "./Censor/info.js";
import { CompanionChannelsPlugin } from "./CompanionChannels/CompanionChannelsPlugin.js";
import { companionChannelsPluginInfo } from "./CompanionChannels/info.js";
import { ContextMenuPlugin } from "./ContextMenus/ContextMenuPlugin.js";
import { contextMenuPluginInfo } from "./ContextMenus/info.js";
import { CountersPlugin } from "./Counters/CountersPlugin.js";
import { countersPluginInfo } from "./Counters/info.js";
import { CustomEventsPlugin } from "./CustomEvents/CustomEventsPlugin.js";
import { customEventsPluginInfo } from "./CustomEvents/info.js";
import { GuildInfoSaverPlugin } from "./GuildInfoSaver/GuildInfoSaverPlugin.js";
import { guildInfoSaverPluginInfo } from "./GuildInfoSaver/info.js";
import { InternalPosterPlugin } from "./InternalPoster/InternalPosterPlugin.js";
import { internalPosterPluginInfo } from "./InternalPoster/info.js";
import { LocateUserPlugin } from "./LocateUser/LocateUserPlugin.js";
import { locateUserPluginInfo } from "./LocateUser/info.js";
import { LogsPlugin } from "./Logs/LogsPlugin.js";
import { logsPluginInfo } from "./Logs/info.js";
import { MessageSaverPlugin } from "./MessageSaver/MessageSaverPlugin.js";
import { messageSaverPluginInfo } from "./MessageSaver/info.js";
import { ModActionsPlugin } from "./ModActions/ModActionsPlugin.js";
import { modActionsPluginInfo } from "./ModActions/info.js";
import { MutesPlugin } from "./Mutes/MutesPlugin.js";
import { mutesPluginInfo } from "./Mutes/info.js";
import { NameHistoryPlugin } from "./NameHistory/NameHistoryPlugin.js";
import { nameHistoryPluginInfo } from "./NameHistory/info.js";
import { PersistPlugin } from "./Persist/PersistPlugin.js";
import { persistPluginInfo } from "./Persist/info.js";
import { PhishermanPlugin } from "./Phisherman/PhishermanPlugin.js";
import { phishermanPluginInfo } from "./Phisherman/info.js";
import { PingableRolesPlugin } from "./PingableRoles/PingableRolesPlugin.js";
import { pingableRolesPluginInfo } from "./PingableRoles/info.js";
import { PostPlugin } from "./Post/PostPlugin.js";
import { postPluginInfo } from "./Post/info.js";
import { ReactionRolesPlugin } from "./ReactionRoles/ReactionRolesPlugin.js";
import { reactionRolesPluginInfo } from "./ReactionRoles/info.js";
import { RemindersPlugin } from "./Reminders/RemindersPlugin.js";
import { remindersPluginInfo } from "./Reminders/info.js";
import { RoleButtonsPlugin } from "./RoleButtons/RoleButtonsPlugin.js";
import { roleButtonsPluginInfo } from "./RoleButtons/info.js";
import { RoleManagerPlugin } from "./RoleManager/RoleManagerPlugin.js";
import { roleManagerPluginInfo } from "./RoleManager/info.js";
import { RolesPlugin } from "./Roles/RolesPlugin.js";
import { rolesPluginInfo } from "./Roles/info.js";
import { SelfGrantableRolesPlugin } from "./SelfGrantableRoles/SelfGrantableRolesPlugin.js";
import { selfGrantableRolesPluginInfo } from "./SelfGrantableRoles/info.js";
import { SlowmodePlugin } from "./Slowmode/SlowmodePlugin.js";
import { slowmodePluginInfo } from "./Slowmode/info.js";
import { SpamPlugin } from "./Spam/SpamPlugin.js";
import { spamPluginInfo } from "./Spam/info.js";
import { StarboardPlugin } from "./Starboard/StarboardPlugin.js";
import { starboardPluginInfo } from "./Starboard/info.js";
import { TagsPlugin } from "./Tags/TagsPlugin.js";
import { tagsPluginInfo } from "./Tags/info.js";
import { TimeAndDatePlugin } from "./TimeAndDate/TimeAndDatePlugin.js";
import { timeAndDatePluginInfo } from "./TimeAndDate/info.js";
import { UsernameSaverPlugin } from "./UsernameSaver/UsernameSaverPlugin.js";
import { usernameSaverPluginInfo } from "./UsernameSaver/info.js";
import { UtilityPlugin } from "./Utility/UtilityPlugin.js";
import { utilityPluginInfo } from "./Utility/info.js";
import { WelcomeMessagePlugin } from "./WelcomeMessage/WelcomeMessagePlugin.js";
import { welcomeMessagePluginInfo } from "./WelcomeMessage/info.js";

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
