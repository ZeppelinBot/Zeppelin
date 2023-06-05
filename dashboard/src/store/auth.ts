import { Module } from "vuex";
import { post } from "../api";
import { AuthState, IntervalType, RootState } from "./types";

// Refresh auth every 15 minutes
const AUTH_REFRESH_INTERVAL = 1000 * 60 * 15;

export const AuthStore: Module<AuthState, RootState> = {
  namespaced: true,

  state: {
    apiKey: null,
    loadedInitialAuth: false,
    authRefreshInterval: null,
    userId: null,
  },

  actions: {
    async loadInitialAuth({ dispatch, commit, state }) {
      if (state.loadedInitialAuth) return;

      const storedKey = localStorage.getItem("apiKey");
      if (storedKey) {
        try {
          const result = await post("auth/validate-key", { key: storedKey });
          if (result.valid) {
            await dispatch("setApiKey", { key: storedKey, userId: result.userId });
            return;
          }
        } catch {} // tslint:disable-line

        console.log("Unable to validate key, removing from localStorage"); // tslint:disable-line
        localStorage.removeItem("apiKey");
      }

      commit("markInitialAuthLoaded");
    },

    setApiKey({ commit, state, dispatch }, { key, userId }) {
      localStorage.setItem("apiKey", key);
      commit("setApiKey", { key, userId });

      dispatch("startAuthAutoRefresh");
    },

    async startAuthAutoRefresh({ commit, state, dispatch }) {
      // End a previously active auto-refresh, if any
      await dispatch("endAuthAutoRefresh");

      // Start new auto-refresh
      const refreshInterval = setInterval(async () => {
        await post("auth/refresh", { key: state.apiKey });
      }, AUTH_REFRESH_INTERVAL);
      commit("setAuthRefreshInterval", refreshInterval);
    },

    endAuthAutoRefresh({ commit, state }) {
      if (state.authRefreshInterval) {
        window.clearInterval(state.authRefreshInterval);
      }
      commit("setAuthRefreshInterval", null);
    },

    async clearApiKey({ commit, dispatch }) {
      await dispatch("endAuthAutoRefresh");

      localStorage.removeItem("apiKey");
      commit("setApiKey", { key: null, userId: null });
    },

    async logout({ dispatch }) {
      await post("auth/logout");
      await dispatch("clearApiKey");
    },

    async expiredLogin({ dispatch }) {
      await dispatch("clearApiKey");
      window.location.assign("/?error=expiredLogin");
    },
  },

  mutations: {
    setApiKey(state: AuthState, { key, userId }) {
      state.apiKey = key;
      state.userId = userId;
    },

    setAuthRefreshInterval(state: AuthState, interval: IntervalType | null) {
      state.authRefreshInterval = interval;
    },

    markInitialAuthLoaded(state: AuthState) {
      state.loadedInitialAuth = true;
    },
  },
};
