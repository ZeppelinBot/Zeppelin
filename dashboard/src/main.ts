import "./style/base.scss";
import "buefy/dist/buefy.css";

import Vue from "vue";
import Buefy from "buefy";
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

Vue.use(Buefy);
const app = new Vue({
  router,
  store: RootStore,
  el: "#app",
  render(h) {
    return h(App);
  },
});
