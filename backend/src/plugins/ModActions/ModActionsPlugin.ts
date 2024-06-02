import { Message } from "discord.js";
import { EventEmitter } from "events";
import { guildPlugin } from "knub";
import { Queue } from "../../Queue.js";
import { GuildCases } from "../../data/GuildCases.js";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { GuildTempbans } from "../../data/GuildTempbans.js";
import { makePublicFn, mapToPublicFn } from "../../pluginUtils.js";
import { MINUTES } from "../../utils.js";
import { CasesPlugin } from "../Cases/CasesPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { MutesPlugin } from "../Mutes/MutesPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { AddCaseCmd } from "./commands/AddCaseCmd.js";
import { BanCmd } from "./commands/BanCmd.js";
import { CaseCmd } from "./commands/CaseCmd.js";
import { CasesModCmd } from "./commands/CasesModCmd.js";
import { CasesUserCmd } from "./commands/CasesUserCmd.js";
import { DeleteCaseCmd } from "./commands/DeleteCaseCmd.js";
import { ForcebanCmd } from "./commands/ForcebanCmd.js";
import { ForcemuteCmd } from "./commands/ForcemuteCmd.js";
import { ForceUnmuteCmd } from "./commands/ForceunmuteCmd.js";
import { HideCaseCmd } from "./commands/HideCaseCmd.js";
import { KickCmd } from "./commands/KickCmd.js";
import { MassbanCmd } from "./commands/MassBanCmd.js";
import { MassunbanCmd } from "./commands/MassUnbanCmd.js";
import { MassmuteCmd } from "./commands/MassmuteCmd.js";
import { MuteCmd } from "./commands/MuteCmd.js";
import { NoteCmd } from "./commands/NoteCmd.js";
import { SoftbanCmd } from "./commands/SoftbanCommand.js";
import { UnbanCmd } from "./commands/UnbanCmd.js";
import { UnhideCaseCmd } from "./commands/UnhideCaseCmd.js";
import { UnmuteCmd } from "./commands/UnmuteCmd.js";
import { UpdateCmd } from "./commands/UpdateCmd.js";
import { WarnCmd } from "./commands/WarnCmd.js";
import { AuditLogEvents } from "./events/AuditLogEvents.js";
import { CreateBanCaseOnManualBanEvt } from "./events/CreateBanCaseOnManualBanEvt.js";
import { CreateUnbanCaseOnManualUnbanEvt } from "./events/CreateUnbanCaseOnManualUnbanEvt.js";
import { PostAlertOnMemberJoinEvt } from "./events/PostAlertOnMemberJoinEvt.js";
import { banUserId } from "./functions/banUserId.js";
import { clearTempban } from "./functions/clearTempban.js";
import { hasMutePermission } from "./functions/hasMutePerm.js";
import { kickMember } from "./functions/kickMember.js";
import { offModActionsEvent } from "./functions/offModActionsEvent.js";
import { onModActionsEvent } from "./functions/onModActionsEvent.js";
import { updateCase } from "./functions/updateCase.js";
import { warnMember } from "./functions/warnMember.js";
import { ModActionsPluginType, zModActionsConfig } from "./types.js";

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

  messageCommands: [
    UpdateCmd,
    NoteCmd,
    WarnCmd,
    MuteCmd,
    ForcemuteCmd,
    UnmuteCmd,
    ForceUnmuteCmd,
    KickCmd,
    SoftbanCmd,
    BanCmd,
    UnbanCmd,
    ForcebanCmd,
    MassbanCmd,
    MassmuteCmd,
    MassunbanCmd,
    AddCaseCmd,
    CaseCmd,
    CasesUserCmd,
    CasesModCmd,
    HideCaseCmd,
    UnhideCaseCmd,
    DeleteCaseCmd,
  ],

  public(pluginData) {
    return {
      warnMember: makePublicFn(pluginData, warnMember),
      kickMember: makePublicFn(pluginData, kickMember),
      banUserId: makePublicFn(pluginData, banUserId),
      updateCase: (msg: Message, caseNumber: number | null, note: string) =>
        updateCase(pluginData, msg, { caseNumber, note }),
      hasMutePermission: makePublicFn(pluginData, hasMutePermission),
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
