import { Module } from "vuex";
import { get } from "../api";
import { DocsState, RootState } from "./types";

export const DocsStore: Module<DocsState, RootState> = {
  namespaced: true,

  state: {
    allPlugins: [],
    loadingAllPlugins: false,

    plugins: {},
  },

  actions: {
    async loadAllPlugins({ state, commit }) {
      if (state.loadingAllPlugins) return;
      commit("setAllPluginLoadStatus", true);

      const plugins = await get("docs/plugins");
      plugins.sort((a, b) => {
        const aName = (a.info.prettyName || a.name).toLowerCase();
        const bName = (b.info.prettyName || b.name).toLowerCase();
        if (aName > bName) return 1;
        if (aName < bName) return -1;
        return 0;
      });
      commit("setAllPlugins", plugins);

      commit("setAllPluginLoadStatus", false);
    },

    async loadPluginData({ state, commit }, name) {
      if (state.plugins[name]) return;

      const data = await get(`docs/plugins/${name}`);
      if (data && data.messageCommands) {
        data.messageCommands.sort((a, b) => {
          const aName = (Array.isArray(a.trigger) ? a.trigger[0] : a.trigger).toLowerCase();
          const bName = (Array.isArray(b.trigger) ? b.trigger[0] : b.trigger).toLowerCase();
          if (aName > bName) return 1;
          if (aName < bName) return -1;
          return 0;
        });
      }
      commit("setPluginData", { name, data });
    },
  },

  mutations: {
    setAllPluginLoadStatus(state: DocsState, status: boolean) {
      state.loadingAllPlugins = status;
    },

    setAllPlugins(state: DocsState, plugins) {
      state.allPlugins = plugins;
    },

    setPluginData(state: DocsState, { name, data }) {
      state.plugins[name] = data;
    },
  },
};
