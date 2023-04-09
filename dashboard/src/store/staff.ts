import { Module } from "vuex";
import { get } from "../api";
import { RootState, StaffState } from "./types";

export const StaffStore: Module<StaffState, RootState> = {
  namespaced: true,

  state: {
    isStaff: false,
  },

  actions: {
    async checkStatus({ commit }) {
      const status = await get("staff/status");
      commit("setStatus", status.isStaff);
    },
  },

  mutations: {
    setStatus(state: StaffState, value: boolean) {
      state.isStaff = value;
    },
  },
};
