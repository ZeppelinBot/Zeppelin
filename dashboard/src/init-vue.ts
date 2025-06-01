import "./style/app.css";

import { createApp } from "vue";

import VueHighlightJS from "vue3-highlightjs";
import "highlight.js/styles/base16/ocean.css";

import { router } from "./routes";
import { RootStore } from "./store";

import "./directives/trim-indents";

import App from "./components/App.vue";
import { trimIndents } from "./directives/trim-indents";

const app = createApp(App);

app.use(router);
app.use(RootStore);

// Set up a read-only global variable to access specific env vars
app.mixin({
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

app.use(VueHighlightJS);

app.directive("trim-indents", trimIndents);

app.mount("#app");
