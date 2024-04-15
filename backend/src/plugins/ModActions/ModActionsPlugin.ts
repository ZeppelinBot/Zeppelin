import { Message } from "discord.js";
import { EventEmitter } from "events";
import { guildPlugin } from "knub";
import { Queue } from "../../Queue";
import { GuildCases } from "../../data/GuildCases";
import { onGuildEvent } from "../../data/GuildEvents";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildTempbans } from "../../data/GuildTempbans";
import { makePublicFn, mapToPublicFn } from "../../pluginUtils";
import { MINUTES } from "../../utils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { AddCaseMsgCmd } from "./commands/addcase/AddCaseMsgCmd";
import { AddCaseSlashCmd } from "./commands/addcase/AddCaseSlashCmd";
import { BanMsgCmd } from "./commands/ban/BanMsgCmd";
import { BanSlashCmd } from "./commands/ban/BanSlashCmd";
import { CaseMsgCmd } from "./commands/case/CaseMsgCmd";
import { CaseSlashCmd } from "./commands/case/CaseSlashCmd";
import { CasesModMsgCmd } from "./commands/cases/CasesModMsgCmd";
import { CasesSlashCmd } from "./commands/cases/CasesSlashCmd";
import { CasesUserMsgCmd } from "./commands/cases/CasesUserMsgCmd";
import { DeleteCaseMsgCmd } from "./commands/deletecase/DeleteCaseMsgCmd";
import { DeleteCaseSlashCmd } from "./commands/deletecase/DeleteCaseSlashCmd";
import { ForceBanMsgCmd } from "./commands/forceban/ForceBanMsgCmd";
import { ForceBanSlashCmd } from "./commands/forceban/ForceBanSlashCmd";
import { ForceMuteMsgCmd } from "./commands/forcemute/ForceMuteMsgCmd";
import { ForceMuteSlashCmd } from "./commands/forcemute/ForceMuteSlashCmd";
import { ForceUnmuteMsgCmd } from "./commands/forceunmute/ForceUnmuteMsgCmd";
import { ForceUnmuteSlashCmd } from "./commands/forceunmute/ForceUnmuteSlashCmd";
import { HideCaseMsgCmd } from "./commands/hidecase/HideCaseMsgCmd";
import { HideCaseSlashCmd } from "./commands/hidecase/HideCaseSlashCmd";
import { KickMsgCmd } from "./commands/kick/KickMsgCmd";
import { KickSlashCmd } from "./commands/kick/KickSlashCmd";
import { MassBanMsgCmd } from "./commands/massban/MassBanMsgCmd";
import { MassBanSlashCmd } from "./commands/massban/MassBanSlashCmd";
import { MassMuteMsgCmd } from "./commands/massmute/MassMuteMsgCmd";
import { MassMuteSlashSlashCmd } from "./commands/massmute/MassMuteSlashCmd";
import { MassUnbanMsgCmd } from "./commands/massunban/MassUnbanMsgCmd";
import { MassUnbanSlashCmd } from "./commands/massunban/MassUnbanSlashCmd";
import { MuteMsgCmd } from "./commands/mute/MuteMsgCmd";
import { MuteSlashCmd } from "./commands/mute/MuteSlashCmd";
import { NoteMsgCmd } from "./commands/note/NoteMsgCmd";
import { NoteSlashCmd } from "./commands/note/NoteSlashCmd";
import { UnbanMsgCmd } from "./commands/unban/UnbanMsgCmd";
import { UnbanSlashCmd } from "./commands/unban/UnbanSlashCmd";
import { UnhideCaseMsgCmd } from "./commands/unhidecase/UnhideCaseMsgCmd";
import { UnhideCaseSlashCmd } from "./commands/unhidecase/UnhideCaseSlashCmd";
import { UnmuteMsgCmd } from "./commands/unmute/UnmuteMsgCmd";
import { UnmuteSlashCmd } from "./commands/unmute/UnmuteSlashCmd";
import { UpdateMsgCmd } from "./commands/update/UpdateMsgCmd";
import { UpdateSlashCmd } from "./commands/update/UpdateSlashCmd";
import { WarnMsgCmd } from "./commands/warn/WarnMsgCmd";
import { WarnSlashCmd } from "./commands/warn/WarnSlashCmd";
import { AuditLogEvents } from "./events/AuditLogEvents";
import { CreateBanCaseOnManualBanEvt } from "./events/CreateBanCaseOnManualBanEvt";
import { CreateUnbanCaseOnManualUnbanEvt } from "./events/CreateUnbanCaseOnManualUnbanEvt";
import { PostAlertOnMemberJoinEvt } from "./events/PostAlertOnMemberJoinEvt";
import { banUserId } from "./functions/banUserId";
import { clearTempban } from "./functions/clearTempban";
import {
  hasBanPermission,
  hasMutePermission,
  hasNotePermission,
  hasWarnPermission,
} from "./functions/hasModActionPerm";
import { kickMember } from "./functions/kickMember";
import { offModActionsEvent } from "./functions/offModActionsEvent";
import { onModActionsEvent } from "./functions/onModActionsEvent";
import { updateCase } from "./functions/updateCase";
import { warnMember } from "./functions/warnMember";
import { AttachmentLinkReactionType, ModActionsPluginType, modActionsSlashGroup, zModActionsConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

const defaultOptions = {
  config: {
    dm_on_warn: true,
    dm_on_kick: false,
    dm_on_ban: false,
    message_on_warn: false,
    message_on_kick: false,
    message_on_ban: false,
    message_channel: null,
    warn_message: "You have received a warning on the {guildName} server: {reason}",
    kick_message: "You have been kicked from the {guildName} server. Reason given: {reason}",
    ban_message: "You have been banned from the {guildName} server. Reason given: {reason}",
    tempban_message: "You have been banned from the {guildName} server for {banTime}. Reason given: {reason}",
    alert_on_rejoin: false,
    alert_channel: null,
    warn_notify_enabled: false,
    warn_notify_threshold: 5,
    warn_notify_message:
      "The user already has **{priorWarnings}** warnings!\n Please check their prior cases and assess whether or not to warn anyways.\n Proceed with the warning?",
    ban_delete_message_days: 1,
    attachment_link_reaction: "warn" as AttachmentLinkReactionType,

    can_note: false,
    can_warn: false,
    can_mute: false,
    can_kick: false,
    can_ban: false,
    can_unban: false,
    can_view: false,
    can_addcase: false,
    can_massunban: false,
    can_massban: false,
    can_massmute: false,
    can_hidecase: false,
    can_deletecase: false,
    can_act_as_other: false,
    create_cases_for_manual_actions: true,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_note: true,
        can_warn: true,
        can_mute: true,
        can_kick: true,
        can_ban: true,
        can_unban: true,
        can_view: true,
        can_addcase: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_massunban: true,
        can_massban: true,
        can_massmute: true,
        can_hidecase: true,
        can_act_as_other: true,
      },
    },
  ],
};

export const ModActionsPlugin = guildPlugin<ModActionsPluginType>()({
  name: "mod_actions",

  dependencies: () => [TimeAndDatePlugin, CasesPlugin, MutesPlugin, LogsPlugin],
  configParser: (input) => zModActionsConfig.parse(input),
  defaultOptions,

  events: [CreateBanCaseOnManualBanEvt, CreateUnbanCaseOnManualUnbanEvt, PostAlertOnMemberJoinEvt, AuditLogEvents],

  slashCommands: [
    modActionsSlashGroup({
      name: "mod",
      description: "Moderation actions",
      defaultMemberPermissions: "0",
      subcommands: [
        AddCaseSlashCmd,
        BanSlashCmd,
        CaseSlashCmd,
        CasesSlashCmd,
        DeleteCaseSlashCmd,
        ForceBanSlashCmd,
        ForceMuteSlashCmd,
        ForceUnmuteSlashCmd,
        HideCaseSlashCmd,
        KickSlashCmd,
        MassBanSlashCmd,
        MassMuteSlashSlashCmd,
        MassUnbanSlashCmd,
        MuteSlashCmd,
        NoteSlashCmd,
        UnbanSlashCmd,
        UnhideCaseSlashCmd,
        UnmuteSlashCmd,
        UpdateSlashCmd,
        WarnSlashCmd,
      ],
    }),
  ],

  messageCommands: [
    UpdateMsgCmd,
    NoteMsgCmd,
    WarnMsgCmd,
    MuteMsgCmd,
    ForceMuteMsgCmd,
    UnmuteMsgCmd,
    ForceUnmuteMsgCmd,
    KickMsgCmd,
    BanMsgCmd,
    UnbanMsgCmd,
    ForceBanMsgCmd,
    MassBanMsgCmd,
    MassMuteMsgCmd,
    MassUnbanMsgCmd,
    AddCaseMsgCmd,
    CaseMsgCmd,
    CasesUserMsgCmd,
    CasesModMsgCmd,
    HideCaseMsgCmd,
    UnhideCaseMsgCmd,
    DeleteCaseMsgCmd,
  ],

  public(pluginData) {
    return {
      warnMember: makePublicFn(pluginData, warnMember),
      kickMember: makePublicFn(pluginData, kickMember),
      banUserId: makePublicFn(pluginData, banUserId),
      updateCase: (msg: Message, caseNumber: number | null, note: string) =>
        updateCase(pluginData, msg, msg.author, caseNumber ?? undefined, note, [...msg.attachments.values()]),
      hasNotePermission: makePublicFn(pluginData, hasNotePermission),
      hasWarnPermission: makePublicFn(pluginData, hasWarnPermission),
      hasMutePermission: makePublicFn(pluginData, hasMutePermission),
      hasBanPermission: makePublicFn(pluginData, hasBanPermission),
      on: mapToPublicFn(onModActionsEvent),
      off: mapToPublicFn(offModActionsEvent),
      getEventEmitter: () => pluginData.state.events,
    };
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.mutes = GuildMutes.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.tempbans = GuildTempbans.getGuildInstance(guild.id);
    state.serverLogs = new GuildLogs(guild.id);

    state.unloaded = false;
    state.ignoredEvents = [];
    // Massbans can take a while depending on rate limits,
    // so we're giving each massban 15 minutes to complete before launching the next massban
    state.massbanQueue = new Queue(15 * MINUTES);

    state.events = new EventEmitter();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.unregisterGuildEventListener = onGuildEvent(guild.id, "expiredTempban", (tempban) =>
      clearTempban(pluginData, tempban),
    );
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.unloaded = true;
    state.unregisterGuildEventListener?.();
    state.events.removeAllListeners();
  },
});
