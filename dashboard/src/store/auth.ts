import { get, post } from "../api";
import { ActionTree, Module } from "vuex";
import { AuthState, RootState } from "./types";

export const AuthStore: Module<AuthState, RootState> = {
  namespaced: true,

  state: {
    apiKey: null,
    loadedInitialAuth: false,
  },

  actions: {
    async loadInitialAuth({ dispatch, commit, state }) {
      if (state.loadedInitialAuth) return;

      const storedKey = localStorage.getItem("apiKey");
      if (storedKey) {
        try {
          const result = await post("auth/validate-key", { key: storedKey });
          if (result.valid) {
            await dispatch("setApiKey", storedKey);
            return;
          }
        } catch {} // tslint:disable-line

        console.log("Unable to validate key, removing from localStorage"); // tslint:disable-line
        localStorage.removeItem("apiKey");
      }

      commit("markInitialAuthLoaded");
    },

    setApiKey({ commit, state }, newKey: string) {
      localStorage.setItem("apiKey", newKey);
      commit("setApiKey", newKey);
    },

    clearApiKey({ commit }) {
      localStorage.removeItem("apiKey");
      commit("setApiKey", null);
    },

    async logout({ dispatch }) {
      await post("auth/logout");
      await dispatch("clearApiKey");
    },
  },

  mutations: {
    setApiKey(state: AuthState, key) {
      state.apiKey = key;
    },

    markInitialAuthLoaded(state: AuthState) {
      state.loadedInitialAuth = true;
    },
  },
};
