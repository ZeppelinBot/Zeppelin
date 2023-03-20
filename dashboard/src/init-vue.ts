import "./style/app.pcss";

import Vue from "vue";

import hljs from "highlight.js/lib/highlight.js";
import hljsYaml from "highlight.js/lib/languages/yaml.js";
import "highlight.js/styles/ocean.css";
import VueHighlightJS from "vue-highlightjs";

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
