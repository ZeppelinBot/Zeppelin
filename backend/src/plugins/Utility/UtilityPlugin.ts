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

export const UtilityPlugin = zeppelinPlugin<UtilityPluginType>()("utility", {
  configSchema: ConfigSchema,

  commands: [BanSearchCmd, InfoCmd, LevelCmd, RolesCmd, SearchCmd, ServerCmd],

  onLoad({ state, guild }) {
    state.logs = new GuildLogs(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.supporters = new Supporters();

    state.lastReload = Date.now();
  },
});
