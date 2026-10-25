import "@fontsource-variable/recursive";
import "./css/global.css";
import "vue-sonner/style.css";
import { client } from "#frontend/client.js";
import { createInertiaApp } from "@inertiajs/vue3";
import { TuyauProvider } from "@adonisjs/inertia/vue";
import { createApp, type DefineComponent, h } from "vue";
import { resolvePageComponent } from "@adonisjs/inertia/helpers";

const appName = import.meta.env.VITE_APP_NAME || "AdonisJS";

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: (name) => {
    return resolvePageComponent(`./${name}.vue`, import.meta.glob<DefineComponent>("./**/pages/*.vue"));
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }) })
      .use(plugin)
      .mount(el);
  },
  progress: {
    color: "#4B5563",
  },
});
