import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { BanOptions, ConfigSchema, KickOptions, ModActionsPluginType, WarnOptions } from "./types";
import { CreateBanCaseOnManualBanEvt } from "./events/CreateBanCaseOnManualBanEvt";
import { CreateUnbanCaseOnManualUnbanEvt } from "./events/CreateUnbanCaseOnManualUnbanEvt";
import { CreateKickCaseOnManualKickEvt } from "./events/CreateKickCaseOnManualKickEvt";
import { UpdateCmd } from "./commands/UpdateCmd";
import { NoteCmd } from "./commands/NoteCmd";
import { WarnCmd } from "./commands/WarnCmd";
import { MuteCmd } from "./commands/MuteCmd";
import { PostAlertOnMemberJoinEvt } from "./events/PostAlertOnMemberJoinEvt";
import { ForcemuteCmd } from "./commands/ForcemuteCmd";
import { UnmuteCmd } from "./commands/UnmuteCmd";
import { KickCmd } from "./commands/KickCmd";
import { SoftbanCmd } from "./commands/SoftbanCommand";
import { BanCmd } from "./commands/BanCmd";
import { UnbanCmd } from "./commands/UnbanCmd";
import { ForcebanCmd } from "./commands/ForcebanCmd";
import { MassunbanCmd } from "./commands/MassUnbanCmd";
import { MassbanCmd } from "./commands/MassBanCmd";
import { AddCaseCmd } from "./commands/AddCaseCmd";
import { CaseCmd } from "./commands/CaseCmd";
import { CasesUserCmd } from "./commands/CasesUserCmd";
import { CasesModCmd } from "./commands/CasesModCmd";
import { HideCaseCmd } from "./commands/HideCaseCmd";
import { UnhideCaseCmd } from "./commands/UnhideCaseCmd";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { ForceUnmuteCmd } from "./commands/ForceunmuteCmd";
import { warnMember } from "./functions/warnMember";
import { Member, Message } from "eris";
import { kickMember } from "./functions/kickMember";
import { banUserId } from "./functions/banUserId";
import { MassmuteCmd } from "./commands/MassmuteCmd";
import { trimPluginDescription } from "../../utils";
import { DeleteCaseCmd } from "./commands/DeleteCaseCmd";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { GuildTempbans } from "../../data/GuildTempbans";
import { outdatedTempbansLoop } from "./functions/outdatedTempbansLoop";
import { EventEmitter } from "events";
import { mapToPublicFn } from "../../pluginUtils";
import { onModActionsEvent } from "./functions/onModActionsEvent";
import { offModActionsEvent } from "./functions/offModActionsEvent";
import { updateCase } from "./functions/updateCase";

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

export const ModActionsPlugin = zeppelinGuildPlugin<ModActionsPluginType>()("mod_actions", {
  showInDocs: true,
  info: {
    prettyName: "Mod actions",
    description: trimPluginDescription(`
      This plugin contains the 'typical' mod actions such as warning, muting, kicking, banning, etc.
    `),
  },

  dependencies: [TimeAndDatePlugin, CasesPlugin, MutesPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  events: [
    CreateBanCaseOnManualBanEvt,
    CreateUnbanCaseOnManualUnbanEvt,
    CreateKickCaseOnManualKickEvt,
    PostAlertOnMemberJoinEvt,
  ],

  commands: [
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

  public: {
    warnMember(pluginData) {
      return (member: Member, reason: string, warnOptions?: WarnOptions) => {
        warnMember(pluginData, member, reason, warnOptions);
      };
    },

    kickMember(pluginData) {
      return (member: Member, reason: string, kickOptions?: KickOptions) => {
        kickMember(pluginData, member, reason, kickOptions);
      };
    },

    banUserId(pluginData) {
      return (userId: string, reason?: string, banOptions?: BanOptions, banTime?: number) => {
        banUserId(pluginData, userId, reason, banOptions, banTime);
      };
    },

    updateCase(pluginData) {
      return (msg: Message, caseNumber: number | null, note: string) => {
        updateCase(pluginData, msg, { caseNumber, note });
      };
    },

    on: mapToPublicFn(onModActionsEvent),
    off: mapToPublicFn(offModActionsEvent),
    getEventEmitter(pluginData) {
      return () => pluginData.state.events;
    },
  },

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.mutes = GuildMutes.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.tempbans = GuildTempbans.getGuildInstance(guild.id);
    state.serverLogs = new GuildLogs(guild.id);

    state.unloaded = false;
    state.outdatedTempbansTimeout = null;
    state.ignoredEvents = [];

    state.events = new EventEmitter();

    outdatedTempbansLoop(pluginData);
  },

  onUnload(pluginData) {
    pluginData.state.unloaded = true;
    pluginData.state.events.removeAllListeners();
  },
});
