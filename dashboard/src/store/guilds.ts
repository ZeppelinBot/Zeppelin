import { get, post } from "../api";
import { Module } from "vuex";
import { GuildState, LoadStatus, RootState } from "./types";

export const GuildStore: Module<GuildState, RootState> = {
  namespaced: true,

  state: {
    availableGuildsLoadStatus: LoadStatus.None,
    available: [],
    configs: {},
  },

  actions: {
    async loadAvailableGuilds({ dispatch, commit, state }) {
      if (state.availableGuildsLoadStatus !== LoadStatus.None) return;
      commit("setAvailableGuildsLoadStatus", LoadStatus.Loading);

      const availableGuilds = await get("guilds/available");
      commit("setAvailableGuilds", availableGuilds);
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

    setAvailableGuilds(state: GuildState, guilds) {
      state.available = guilds;
      state.availableGuildsLoadStatus = LoadStatus.Done;
    },

    setConfig(state: GuildState, { guildId, config }) {
      state.configs[guildId] = config;
    },
  },
};
