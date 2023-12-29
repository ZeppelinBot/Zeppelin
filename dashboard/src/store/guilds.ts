import Vue from "vue";
import { Module } from "vuex";
import { get, post } from "../api";
import { GuildState, LoadStatus, RootState } from "./types";

export const GuildStore: Module<GuildState, RootState> = {
  namespaced: true,

  state: {
    availableGuildsLoadStatus: LoadStatus.None,
    available: new Map(),
    configs: {},
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

    async loadMyPermissionAssignments({ commit }) {
      const myPermissionAssignments = await get(`guilds/my-permissions`);
      for (const permissionAssignment of myPermissionAssignments) {
        commit("setGuildPermissionAssignments", {
          guildId: permissionAssignment.guild_id,
          permissionAssignments: [permissionAssignment],
        });
      }
    },

    async loadGuildPermissionAssignments({ commit }, guildId) {
      const permissionAssignments = await get(`guilds/${guildId}/permissions`);
      commit("setGuildPermissionAssignments", { guildId, permissionAssignments });
    },

    async setTargetPermissions({ commit }, { guildId, targetId, type, permissions, expiresAt }) {
      await post(`guilds/${guildId}/set-target-permissions`, { guildId, targetId, type, permissions, expiresAt });
      commit("setTargetPermissions", { guildId, targetId, type, permissions, expiresAt });
    },

    async importData({ commit }, { guildId, data, caseHandlingMode }) {
      return post(`guilds/${guildId}/import`, {
        data,
        caseHandlingMode,
      });
    },

    async exportData({ commit }, { guildId }) {
      return post(`guilds/${guildId}/export`);
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

    setGuildPermissionAssignments(state: GuildState, { guildId, permissionAssignments }) {
      if (!state.guildPermissionAssignments) {
        Vue.set(state, "guildPermissionAssignments", {});
      }

      Vue.set(
        state.guildPermissionAssignments,
        guildId,
        permissionAssignments.map((p) => ({
          ...p,
          permissions: new Set(p.permissions),
        })),
      );
    },

    setTargetPermissions(state: GuildState, { guildId, targetId, type, permissions, expiresAt }) {
      const guildPermissionAssignments = state.guildPermissionAssignments[guildId] || [];
      if (permissions.length === 0) {
        // No permissions -> remove permission assignment
        guildPermissionAssignments.splice(
          guildPermissionAssignments.findIndex((p) => p.target_id === targetId && p.type === type),
          1,
        );
      } else {
        // Update/add permission assignment
        const itemToEdit = guildPermissionAssignments.find((p) => p.target_id === targetId && p.type === type);
        if (itemToEdit) {
          itemToEdit.permissions = new Set(permissions);
        } else {
          state.guildPermissionAssignments[guildId].push({
            type,
            target_id: targetId,
            permissions: new Set(permissions),
            expires_at: expiresAt,
          });
        }
      }

      state.guildPermissionAssignments = { ...state.guildPermissionAssignments };
    },
  },
};
