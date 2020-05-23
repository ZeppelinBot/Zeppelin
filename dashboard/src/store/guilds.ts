import { get, post } from "../api";
import { Module } from "vuex";
import { GuildState, LoadStatus, RootState } from "./types";

export const GuildStore: Module<GuildState, RootState> = {
  namespaced: true,

  state: {
    availableGuildsLoadStatus: LoadStatus.None,
    available: new Map(),
    configs: {},
  },

  actions: {
    async loadAvailableGuilds({ dispatch, commit, state }) {
      if (state.availableGuildsLoadStatus !== LoadStatus.None) return;
      commit("setAvailableGuildsLoadStatus", LoadStatus.Loading);

      const availableGuilds = await get("guilds/available");
      for (const guild of availableGuilds) {
        commit("addGuild", guild);
      }

      commit("setAvailableGuildsLoadStatus", LoadStatus.Done);
    },

    async loadGuild({ commit, state }, guildId) {
      if (state.available.has(guildId)) {
        return;
      }

      const guild = await get(`guilds/${guildId}`);
      if (guild) {
        commit("addGuild", guild);
      }
    },

    async loadConfig({ commit }, guildId) {
      const result = await get(`guilds/${guildId}/config`);
      commit("setConfig", { guildId, config: result.config });
    },

    async saveConfig({ commit }, { guildId, config }) {
      await post(`guilds/${guildId}/config`, { config });
    },
  },

  mutations: {
    setAvailableGuildsLoadStatus(state: GuildState, status: LoadStatus) {
      state.availableGuildsLoadStatus = status;
    },

    addGuild(state: GuildState, guild) {
      state.available.set(guild.id, guild);
    },

    setConfig(state: GuildState, { guildId, config }) {
      state.configs[guildId] = config;
    },
  },
};
