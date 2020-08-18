import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
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
import { MassbanCmd } from "./commands/MassBanCmd";
import { AddCaseCmd } from "./commands/AddCaseCmd";
import { CaseCmd } from "./commands/CaseCmd";
import { CasesUserCmd } from "./commands/CasesUserCmd";
import { CasesModCmd } from "./commands/CasesModCmd";
import { HideCaseCmd } from "./commands/HideCaseCmd";
import { UnhideCaseCmd } from "./commands/UnhideCaseCmd";
import { GuildMutes } from "src/data/GuildMutes";
import { GuildCases } from "src/data/GuildCases";
import { GuildLogs } from "src/data/GuildLogs";
import { ForceUnmuteCmd } from "./commands/ForceunmuteCmd";
import { warnMember } from "./functions/warnMember";
import { Member } from "eris";
import { kickMember } from "./functions/kickMember";
import { banUserId } from "./functions/banUserId";
import { MassmuteCmd } from "./commands/MassmuteCmd";
import { trimPluginDescription } from "../../utils";
import { DeleteCaseCmd } from "./commands/DeleteCaseCmd";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";

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
    can_view: false,
    can_addcase: false,
    can_massban: false,
    can_massmute: false,
    can_hidecase: false,
    can_deletecase: false,
    can_act_as_other: false,
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
        can_view: true,
        can_addcase: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_massban: true,
        can_massmute: true,
        can_hidecase: true,
        can_act_as_other: true,
      },
    },
  ],
};

export const ModActionsPlugin = zeppelinPlugin<ModActionsPluginType>()("mod_actions", {
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
      return (userId: string, reason?: string, banOptions?: BanOptions) => {
        banUserId(pluginData, userId, reason, banOptions);
      };
    },
  },

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.mutes = GuildMutes.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.serverLogs = new GuildLogs(guild.id);

    state.ignoredEvents = [];
  },
});
