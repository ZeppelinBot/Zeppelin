import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, UtilityPluginType } from "./types";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildCases } from "../../data/GuildCases";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildArchives } from "../../data/GuildArchives";
import { Supporters } from "../../data/Supporters";
import { ServerCmd } from "./commands/ServerCmd";
import { RolesCmd } from "./commands/RolesCmd";
import { LevelCmd } from "./commands/LevelCmd";
import { SearchCmd } from "./commands/SearchCmd";
import { BanSearchCmd } from "./commands/BanSearchCmd";
import { InfoCmd } from "./commands/InfoCmd";
import { NicknameResetCmd } from "./commands/NicknameResetCmd";
import { NicknameCmd } from "./commands/NicknameCmd";
import { PingCmd } from "./commands/PingCmd";
import { SourceCmd } from "./commands/SourceCmd";
import { ContextCmd } from "./commands/ContextCmd";
import { VcmoveCmd } from "./commands/VcmoveCmd";
import { HelpCmd } from "./commands/HelpCmd";
import { AboutCmd } from "./commands/AboutCmd";

export const UtilityPlugin = zeppelinPlugin<UtilityPluginType>()("utility", {
  configSchema: ConfigSchema,

  // prettier-ignore
  commands: [
    SearchCmd,
    BanSearchCmd,
    InfoCmd,
    LevelCmd,
    RolesCmd,
    ServerCmd,
    NicknameResetCmd,
    NicknameCmd,
    PingCmd,
    SourceCmd,
    ContextCmd,
    VcmoveCmd,
    HelpCmd,
    AboutCmd,
  ],

  onLoad({ state, guild }) {
    state.logs = new GuildLogs(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.supporters = new Supporters();

    state.lastReload = Date.now();
  },
});
