import "./style/base.scss";

import Vue from "vue";
import { RootStore } from "./store";
import { router } from "./routes";

// Set up a read-only global variable to access specific env vars
Vue.mixin({
  data() {
    return {
      get env() {
        return Object.freeze({
          API_URL: process.env.API_URL,
        });
      },
    };
  },
});

import App from "./components/App.vue";
import Login from "./components/Login.vue";
import { get } from "./api";

const app = new Vue({
  router,
  store: RootStore,
  el: "#app",
  render(h) {
    return h(App);
  },
});
