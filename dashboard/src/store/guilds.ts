import { get, post } from "../api";
import { Module } from "vuex";
import { GuildState, LoadStatus, RootState } from "./types";
import { ApiPermissions } from "@shared/apiPermissions";
import Vue from "vue";

export const GuildStore: Module<GuildState, RootState> = {
  namespaced: true,

  state: {
    availableGuildsLoadStatus: LoadStatus.None,
    available: new Map(),
    configs: {},
    myPermissions: {},
    guildPermissionAssignments: {},
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

    async checkPermission({ commit }, { guildId, permission }) {
      const result = await post(`guilds/${guildId}/check-permission`, { permission });
      commit("setMyPermission", { guildId, permission, value: result.result });
    },

    async loadGuildPermissionAssignments({ commit }, guildId) {
      const permissionAssignments = await get(`guilds/${guildId}/permissions`);
      commit("setGuildPermissionAssignments", { guildId, permissionAssignments });
    },

    async setTargetPermissions({ commit }, { guildId, targetId, type, permissions }) {
      commit("setTargetPermissions", { guildId, targetId, type, permissions });
    },
  },

  mutations: {
    setAvailableGuildsLoadStatus(state: GuildState, status: LoadStatus) {
      state.availableGuildsLoadStatus = status;
    },

    addGuild(state: GuildState, guild) {
      state.available.set(guild.id, guild);
      state.available = state.available;
    },

    setConfig(state: GuildState, { guildId, config }) {
      Vue.set(state.configs, guildId, config);
    },

    setMyPermission(state: GuildState, { guildId, permission, value }) {
      Vue.set(state.myPermissions, guildId, state.myPermissions[guildId] || {});
      Vue.set(state.myPermissions[guildId], permission, value);
    },

    setGuildPermissionAssignments(state: GuildState, { guildId, permissionAssignments }) {
      Vue.set(
        state.guildPermissionAssignments,
        guildId,
        permissionAssignments.map(p => ({
          ...p,
          permissions: new Set(p.permissions),
        })),
      );
    },

    setTargetPermissions(state: GuildState, { guildId, targetId, type, permissions }) {
      const guildPermissionAssignments = state.guildPermissionAssignments[guildId] || [];
      const itemToEdit = guildPermissionAssignments.find(p => p.target_id === targetId && p.type === type);
      if (!itemToEdit) return;

      itemToEdit.permissions = permissions;
      state.guildPermissionAssignments = { ...state.guildPermissionAssignments };
    },
  },
};
