import { GuildMember, Message } from "discord.js";
import { EventEmitter } from "events";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildTempbans } from "../../data/GuildTempbans";
import { mapToPublicFn } from "../../pluginUtils";
import { Queue } from "../../Queue";
import { MINUTES, trimPluginDescription } from "../../utils";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AddCaseCmd } from "./commands/AddCaseCmd";
import { BanCmd } from "./commands/BanCmd";
import { CaseCmd } from "./commands/CaseCmd";
import { CasesModCmd } from "./commands/CasesModCmd";
import { CasesUserCmd } from "./commands/CasesUserCmd";
import { DeleteCaseCmd } from "./commands/DeleteCaseCmd";
import { ForcebanCmd } from "./commands/ForcebanCmd";
import { ForcemuteCmd } from "./commands/ForcemuteCmd";
import { ForceUnmuteCmd } from "./commands/ForceunmuteCmd";
import { HideCaseCmd } from "./commands/HideCaseCmd";
import { KickCmd } from "./commands/KickCmd";
import { MassbanCmd } from "./commands/MassBanCmd";
import { MassmuteCmd } from "./commands/MassmuteCmd";
import { MassunbanCmd } from "./commands/MassUnbanCmd";
import { MuteCmd } from "./commands/MuteCmd";
import { NoteCmd } from "./commands/NoteCmd";
import { SoftbanCmd } from "./commands/SoftbanCommand";
import { UnbanCmd } from "./commands/UnbanCmd";
import { UnhideCaseCmd } from "./commands/UnhideCaseCmd";
import { UnmuteCmd } from "./commands/UnmuteCmd";
import { UpdateCmd } from "./commands/UpdateCmd";
import { WarnCmd } from "./commands/WarnCmd";
import { CreateBanCaseOnManualBanEvt } from "./events/CreateBanCaseOnManualBanEvt";
import { CreateKickCaseOnManualKickEvt } from "./events/CreateKickCaseOnManualKickEvt";
import { CreateUnbanCaseOnManualUnbanEvt } from "./events/CreateUnbanCaseOnManualUnbanEvt";
import { PostAlertOnMemberJoinEvt } from "./events/PostAlertOnMemberJoinEvt";
import { banUserId } from "./functions/banUserId";
import { kickMember } from "./functions/kickMember";
import { offModActionsEvent } from "./functions/offModActionsEvent";
import { onModActionsEvent } from "./functions/onModActionsEvent";
import { outdatedTempbansLoop } from "./functions/outdatedTempbansLoop";
import { updateCase } from "./functions/updateCase";
import { warnMember } from "./functions/warnMember";
import { BanOptions, ConfigSchema, KickOptions, ModActionsPluginType, WarnOptions } from "./types";

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

export const ModActionsPlugin = zeppelinGuildPlugin<ModActionsPluginType>()({
  name: "mod_actions",
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
      return (member: GuildMember, reason: string, warnOptions?: WarnOptions) => {
        warnMember(pluginData, member, reason, warnOptions);
      };
    },

    kickMember(pluginData) {
      return (member: GuildMember, reason: string, kickOptions?: KickOptions) => {
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

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.mutes = GuildMutes.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.tempbans = GuildTempbans.getGuildInstance(guild.id);
    state.serverLogs = new GuildLogs(guild.id);

    state.unloaded = false;
    state.outdatedTempbansTimeout = null;
    state.ignoredEvents = [];
    // Massbans can take a while depending on rate limits,
    // so we're giving each massban 15 minutes to complete before launching the next massban
    state.massbanQueue = new Queue(15 * MINUTES);

    state.events = new EventEmitter();
  },

  afterLoad(pluginData) {
    outdatedTempbansLoop(pluginData);
  },

  beforeUnload(pluginData) {
    pluginData.state.unloaded = true;
    pluginData.state.events.removeAllListeners();
  },
});
