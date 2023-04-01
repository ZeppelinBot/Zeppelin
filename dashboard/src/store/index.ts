import Vue from "vue";
import Vuex, { Store } from "vuex";

Vue.use(Vuex);

import { AuthStore } from "./auth";
import { DocsStore } from "./docs";
import { GuildStore } from "./guilds";
import { RootState } from "./types";

export const RootStore = new Vuex.Store<RootState>({
  modules: {
    auth: AuthStore,
    guilds: GuildStore,
    docs: DocsStore,
  },
});

// Set up typings so Vue/our components know about the state's types
declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    // @ts-ignore
    store?: Store<RootState>;
  }
}

declare module "vue/types/vue" {
  interface Vue {
    // @ts-ignore
    $store: Store<RootState>;
  }
}
