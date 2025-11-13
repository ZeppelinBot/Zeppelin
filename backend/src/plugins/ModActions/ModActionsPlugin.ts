import { Message } from "discord.js";
import { EventEmitter } from "events";
import { guildPlugin } from "vety";
import { Queue } from "../../Queue.js";
import { GuildCases } from "../../data/GuildCases.js";
import { onGuildEvent } from "../../data/GuildEvents.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { GuildTempbans } from "../../data/GuildTempbans.js";
import { makePublicFn, mapToPublicFn } from "../../pluginUtils.js";
import { MINUTES } from "../../utils.js";
import { CasesPlugin } from "../Cases/CasesPlugin.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { MutesPlugin } from "../Mutes/MutesPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { AddCaseMsgCmd } from "./commands/addcase/AddCaseMsgCmd.js";
import { AddCaseSlashCmd } from "./commands/addcase/AddCaseSlashCmd.js";
import { BanMsgCmd } from "./commands/ban/BanMsgCmd.js";
import { BanSlashCmd } from "./commands/ban/BanSlashCmd.js";
import { CaseMsgCmd } from "./commands/case/CaseMsgCmd.js";
import { CaseSlashCmd } from "./commands/case/CaseSlashCmd.js";
import { CasesModMsgCmd } from "./commands/cases/CasesModMsgCmd.js";
import { CasesSlashCmd } from "./commands/cases/CasesSlashCmd.js";
import { CasesUserMsgCmd } from "./commands/cases/CasesUserMsgCmd.js";
import { DeleteCaseMsgCmd } from "./commands/deletecase/DeleteCaseMsgCmd.js";
import { DeleteCaseSlashCmd } from "./commands/deletecase/DeleteCaseSlashCmd.js";
import { ForceBanMsgCmd } from "./commands/forceban/ForceBanMsgCmd.js";
import { ForceBanSlashCmd } from "./commands/forceban/ForceBanSlashCmd.js";
import { ForceMuteMsgCmd } from "./commands/forcemute/ForceMuteMsgCmd.js";
import { ForceMuteSlashCmd } from "./commands/forcemute/ForceMuteSlashCmd.js";
import { ForceUnmuteMsgCmd } from "./commands/forceunmute/ForceUnmuteMsgCmd.js";
import { ForceUnmuteSlashCmd } from "./commands/forceunmute/ForceUnmuteSlashCmd.js";
import { HideCaseMsgCmd } from "./commands/hidecase/HideCaseMsgCmd.js";
import { HideCaseSlashCmd } from "./commands/hidecase/HideCaseSlashCmd.js";
import { KickMsgCmd } from "./commands/kick/KickMsgCmd.js";
import { KickSlashCmd } from "./commands/kick/KickSlashCmd.js";
import { MassBanMsgCmd } from "./commands/massban/MassBanMsgCmd.js";
import { MassBanSlashCmd } from "./commands/massban/MassBanSlashCmd.js";
import { MassMuteMsgCmd } from "./commands/massmute/MassMuteMsgCmd.js";
import { MassMuteSlashSlashCmd } from "./commands/massmute/MassMuteSlashCmd.js";
import { MassUnbanMsgCmd } from "./commands/massunban/MassUnbanMsgCmd.js";
import { MassUnbanSlashCmd } from "./commands/massunban/MassUnbanSlashCmd.js";
import { MuteMsgCmd } from "./commands/mute/MuteMsgCmd.js";
import { MuteSlashCmd } from "./commands/mute/MuteSlashCmd.js";
import { NoteMsgCmd } from "./commands/note/NoteMsgCmd.js";
import { NoteSlashCmd } from "./commands/note/NoteSlashCmd.js";
import { UnbanMsgCmd } from "./commands/unban/UnbanMsgCmd.js";
import { UnbanSlashCmd } from "./commands/unban/UnbanSlashCmd.js";
import { UnhideCaseMsgCmd } from "./commands/unhidecase/UnhideCaseMsgCmd.js";
import { UnhideCaseSlashCmd } from "./commands/unhidecase/UnhideCaseSlashCmd.js";
import { UnmuteMsgCmd } from "./commands/unmute/UnmuteMsgCmd.js";
import { UnmuteSlashCmd } from "./commands/unmute/UnmuteSlashCmd.js";
import { UpdateMsgCmd } from "./commands/update/UpdateMsgCmd.js";
import { UpdateSlashCmd } from "./commands/update/UpdateSlashCmd.js";
import { WarnMsgCmd } from "./commands/warn/WarnMsgCmd.js";
import { WarnSlashCmd } from "./commands/warn/WarnSlashCmd.js";
import { AuditLogEvents } from "./events/AuditLogEvents.js";
import { CreateBanCaseOnManualBanEvt } from "./events/CreateBanCaseOnManualBanEvt.js";
import { CreateUnbanCaseOnManualUnbanEvt } from "./events/CreateUnbanCaseOnManualUnbanEvt.js";
import { PostAlertOnMemberJoinEvt } from "./events/PostAlertOnMemberJoinEvt.js";
import { banUserId } from "./functions/banUserId.js";
import { clearTempban } from "./functions/clearTempban.js";
import {
  hasBanPermission,
  hasMutePermission,
  hasNotePermission,
  hasWarnPermission,
} from "./functions/hasModActionPerm.js";
import { kickMember } from "./functions/kickMember.js";
import { offModActionsEvent } from "./functions/offModActionsEvent.js";
import { onModActionsEvent } from "./functions/onModActionsEvent.js";
import { updateCase } from "./functions/updateCase.js";
import { warnMember } from "./functions/warnMember.js";
import { ModActionsPluginType, modActionsSlashGroup, zModActionsConfig } from "./types.js";

export const ModActionsPlugin = guildPlugin<ModActionsPluginType>()({
  name: "mod_actions",

  dependencies: () => [TimeAndDatePlugin, CasesPlugin, MutesPlugin, LogsPlugin],
  configSchema: zModActionsConfig,
  defaultOverrides: [
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
