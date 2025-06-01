import "./style/app.css";

import { createApp } from "vue";

import "highlight.js/styles/base16/ocean.css";
import VueHighlightJS from "vue3-highlightjs";

import { router } from "./routes";
import { RootStore } from "./store";

import "./directives/trim-indents";

import App from "./components/App.vue";
import { trimIndents } from "./directives/trim-indents";

if (!window.API_URL) {
  throw new Error("Missing API_URL");
}

const app = createApp(App);

app.use(router);
app.use(RootStore);
app.use(VueHighlightJS);

app.directive("trim-indents", trimIndents);

app.mount("#app");
