import "./style/app.pcss";

import Vue from "vue";

import VueHighlightJS from "@highlightjs/vue-plugin";
import hljs from "highlight.js/lib/core";
import hljsYaml from "highlight.js/lib/languages/yaml.js";
import "highlight.js/styles/base16/ocean.css";

import { router } from "./routes";
import { RootStore } from "./store";

import "./directives/trim-indents";

import App from "./components/App.vue";

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

hljs.registerLanguage("yaml", hljsYaml);
Vue.use(VueHighlightJS, { hljs });

const app = new Vue({
  router,
  store: RootStore,
  el: "#app",
  render(h) {
    return h(App);
  },
});
