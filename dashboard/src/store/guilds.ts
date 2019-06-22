import { get } from "../api";
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
  },

  mutations: {
    setAvailableGuildsLoadStatus(state: GuildState, status: LoadStatus) {
      state.availableGuildsLoadStatus = status;
    },

    setAvailableGuilds(state: GuildState, guilds) {
      state.available = guilds;
      state.availableGuildsLoadStatus = LoadStatus.Done;
    },
  },
};
